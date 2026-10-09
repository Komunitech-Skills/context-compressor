#!/usr/bin/env python3
"""Validate v3 plans and compare complete paired-attempt evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

FROZEN = (
    "model", "openclaw", "reasoning", "provider", "prompt_sha256",
    "fixture_sha256", "tool_policy", "timeout_seconds", "context_budget",
)
LANES = {"deterministic-e2e", "natural-discovery", "forced-use", "runtime-e2e"}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> Any:
    return json.loads(path.read_text())


def validate_plan(plan: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if plan.get("schema") != "rin.evaluation/v3":
        errors.append("schema must be rin.evaluation/v3")
    if not isinstance(plan.get("product"), str) or not plan["product"]:
        errors.append("product is required")
    lanes = plan.get("lanes", [])
    if not isinstance(lanes, list) or not {"deterministic-e2e", "natural-discovery"}.issubset(lanes):
        errors.append("deterministic-e2e and natural-discovery lanes are required")
    if set(lanes) - LANES:
        errors.append("unknown lane")
    if plan.get("repetitions", 0) < 3:
        errors.append("at least three repetitions are required")
    frozen = plan.get("frozen", [])
    missing_frozen = sorted(set(FROZEN) - set(frozen))
    if missing_frozen:
        errors.append("missing frozen fields: " + ", ".join(missing_frozen))
    acceptance = plan.get("acceptance", {})
    expected = {
        "runtime_valid_rate_min": 0.95,
        "automatic_uptake_min": 0.90,
        "manual_uptake_min": 1.0,
        "quality_relative_gain_min": 0.10,
        "token_reduction_min": 0.15,
    }
    for key, floor in expected.items():
        value = acceptance.get(key)
        if not isinstance(value, (int, float)) or value < floor:
            errors.append(f"acceptance.{key} must be >= {floor}")
    cases = plan.get("cases", [])
    if not isinstance(cases, list) or len(cases) < 8:
        errors.append("at least eight cases are required")
        return errors
    ids = [case.get("id") for case in cases if isinstance(case, dict)]
    if len(ids) != len(cases) or any(not isinstance(item, str) or not item for item in ids):
        errors.append("every case needs a non-empty id")
    elif len(ids) != len(set(ids)):
        errors.append("case ids must be unique")
    heldout = sum(case.get("set") == "heldout" for case in cases if isinstance(case, dict))
    negative = sum(bool(case.get("negative")) for case in cases if isinstance(case, dict))
    if heldout < 3:
        errors.append("at least three held-out cases are required")
    if negative < 2:
        errors.append("at least two negative/failure cases are required")
    for case in cases:
        if not isinstance(case, dict):
            errors.append("case must be an object")
            continue
        for key in ("id", "set", "capability", "prompt", "oracle", "treatment_receipt"):
            if not case.get(key):
                errors.append(f"case {case.get('id', '?')} missing {key}")
        if case.get("set") not in {"development", "heldout"}:
            errors.append(f"case {case.get('id', '?')} has invalid set")
    return errors


def validate_attempts(plan: dict[str, Any], attempts: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    case_ids = {case["id"] for case in plan["cases"]}
    groups: dict[tuple[str, str, int], dict[str, dict[str, Any]]] = defaultdict(dict)
    for row in attempts:
        try:
            key = (row["case_id"], row["lane"], int(row["repetition"]))
            arm = row["arm"]
        except (KeyError, TypeError, ValueError):
            errors.append("attempt missing case_id/lane/repetition/arm")
            continue
        if key[0] not in case_ids:
            errors.append(f"unknown case: {key[0]}")
        if key[1] not in set(plan["lanes"]) - {"deterministic-e2e", "runtime-e2e"}:
            errors.append(f"invalid comparative lane: {key[1]}")
        if arm not in {"baseline", "treatment"}:
            errors.append(f"invalid arm for {key}")
        if arm in groups[key]:
            errors.append(f"duplicate {arm} attempt for {key}")
        groups[key][arm] = row
    expected = len(plan["cases"]) * plan["repetitions"]
    lane_counts = Counter(key[1] for key in groups)
    for lane in set(plan["lanes"]) & {"natural-discovery", "forced-use"}:
        if lane_counts[lane] != expected:
            errors.append(f"lane {lane} has {lane_counts[lane]}/{expected} complete pair slots")
    for key, pair in groups.items():
        if set(pair) != {"baseline", "treatment"}:
            errors.append(f"incomplete pair: {key}")
            continue
        for field in FROZEN:
            if pair["baseline"].get(field) != pair["treatment"].get(field):
                errors.append(f"pair {key} differs on frozen field {field}")
        for arm, row in pair.items():
            if not isinstance(row.get("runtime_valid"), bool):
                errors.append(f"{key} {arm} missing runtime_valid boolean")
            if not isinstance(row.get("quality"), (int, float)):
                errors.append(f"{key} {arm} missing numeric quality")
            if not isinstance(row.get("tokens"), int) or row.get("tokens", -1) < 0:
                errors.append(f"{key} {arm} has invalid tokens")
            if not isinstance(row.get("latency_ms"), int) or row.get("latency_ms", -1) < 0:
                errors.append(f"{key} {arm} has invalid latency_ms")
            if not isinstance(row.get("critical_failure"), bool):
                errors.append(f"{key} {arm} missing critical_failure boolean")
            receipt = row.get("treatment_receipt")
            if receipt is not None and (not isinstance(receipt, str) or not receipt.strip()):
                errors.append(f"{key} {arm} has invalid treatment_receipt")
        if pair["baseline"].get("treatment_receipt"):
            errors.append(f"baseline contains treatment receipt: {key}")
    return errors


def validate_evidence(plan_path: Path, evidence: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    source = evidence.get("source")
    if not isinstance(source, dict):
        return ["evidence.source is required"]
    for field in ("commit", "tree"):
        value = source.get(field)
        if not isinstance(value, str) or len(value) != 40 or any(char not in "0123456789abcdef" for char in value):
            errors.append(f"source.{field} must be a full lowercase Git object id")
    if source.get("plan_sha256") != digest(plan_path):
        errors.append("source.plan_sha256 does not match the evaluated plan")
    environment = evidence.get("environment")
    if not isinstance(environment, dict):
        errors.append("evidence.environment is required")
    else:
        for field in ("model", "openclaw", "reasoning", "provider", "tool_policy", "timeout_seconds", "context_budget"):
            if field not in environment:
                errors.append(f"environment.{field} is required")
    if evidence.get("selection") != "all-preregistered-attempts-including-failures":
        errors.append("selection must retain all preregistered attempts including failures")
    return errors


def summarize(plan: dict[str, Any], attempts: list[dict[str, Any]]) -> dict[str, Any]:
    output: dict[str, Any] = {"schema": "rin.evaluation-result/v3", "product": plan["product"], "lanes": {}}
    for lane in set(plan["lanes"]) & {"natural-discovery", "forced-use"}:
        rows = [row for row in attempts if row["lane"] == lane]
        valid = [row for row in rows if row["runtime_valid"]]
        treatment = [row for row in valid if row["arm"] == "treatment"]
        baseline = [row for row in valid if row["arm"] == "baseline"]
        used = [row for row in treatment if row.get("treatment_receipt")]
        def mean(items: list[dict[str, Any]], field: str) -> float | None:
            return round(sum(row[field] for row in items) / len(items), 4) if items else None
        bq, tq = mean(baseline, "quality"), mean(treatment, "quality")
        bt, tt = mean(baseline, "tokens"), mean(treatment, "tokens")
        uptake = round(len(used) / len(treatment), 4) if treatment else 0
        runtime_rate = round(len(valid) / len(rows), 4) if rows else 0
        critical = any(row.get("critical_failure") for row in treatment)
        quality_gain = ((tq - bq) / bq) if bq and tq is not None else None
        heldout = [row for row in valid if row["case_id"] in {case["id"] for case in plan["cases"] if case["set"] == "heldout"}]
        heldout_b = mean([row for row in heldout if row["arm"] == "baseline"], "quality")
        heldout_t = mean([row for row in heldout if row["arm"] == "treatment"], "quality")
        uptake_floor = plan["acceptance"]["manual_uptake_min"] if lane == "forced-use" else plan["acceptance"]["automatic_uptake_min"]
        gates = {
            "runtime_valid": runtime_rate >= plan["acceptance"]["runtime_valid_rate_min"],
            "treatment_uptake": uptake >= uptake_floor,
            "no_critical_regression": not critical,
            "heldout_not_lower": heldout_b is not None and heldout_t is not None and heldout_t >= heldout_b,
        }
        output["lanes"][lane] = {
            "attempts": len(rows),
            "runtime_valid_rate": runtime_rate,
            "treatment_uptake": uptake,
            "intention_to_treat": {"baseline_quality": bq, "treatment_quality": tq},
            "per_protocol": {"treatment_quality": mean(used, "quality")},
            "quality_relative_gain": round(quality_gain, 4) if quality_gain is not None else None,
            "token_reduction": round((bt - tt) / bt, 4) if bt and tt is not None else None,
            "baseline_latency_ms": mean(baseline, "latency_ms"),
            "treatment_latency_ms": mean(treatment, "latency_ms"),
            "gates": gates,
            "accepted": all(gates.values()),
        }
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path)
    parser.add_argument("--attempts", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    plan = load(args.plan)
    errors = validate_plan(plan)
    attempts = None
    evidence = None
    if args.attempts:
        evidence = load(args.attempts)
        if not isinstance(evidence, dict):
            errors.append("evidence must be an object")
        else:
            errors.extend(validate_evidence(args.plan, evidence))
            attempts = evidence.get("attempts")
            if not isinstance(attempts, list):
                errors.append("evidence.attempts must be an array")
            else:
                errors.extend(validate_attempts(plan, attempts))
    report = {
        "valid": not errors,
        "plan_sha256": digest(args.plan),
        "status": "complete" if attempts is not None and not errors else ("not-run" if attempts is None and not errors else "invalid"),
        "errors": errors,
    }
    if attempts is not None and not errors:
        report["source"] = evidence["source"]
        report["environment"] = evidence["environment"]
        report["summary"] = summarize(plan, attempts)
    encoded = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded)
    print(encoded, end="")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
