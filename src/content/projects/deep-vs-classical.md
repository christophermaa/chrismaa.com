---
title: When does deep learning earn its cost?
summary: A systematic benchmark of deep architectures against classical ML baselines on EEG, measuring accuracy, latency, stability and compute, run as parallel batch jobs on CSC HPC.
role: Doctoral research
tags: [Benchmarking, PyTorch, Classical ML, HPC]
domain: ai
year: 2025 — now
featured: true
size: sm
order: 4
---

## The question
Deep models often win on accuracy leaderboards, but a real-time system also pays for latency, instability across sessions and compute. This project measures all four to decide **when** a deep model is worth deploying.

## How
- The same causal preprocessing and data splits are used for every model, so comparisons are fair.
- Deep architectures are compared with classical ML baselines on accuracy, latency, stability and compute cost.
- Sweeps run as parallel batch pipelines on CSC supercomputers.
