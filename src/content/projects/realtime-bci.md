---
title: Real-time closed-loop BCI
summary: A streaming pipeline that classifies error-related brain responses from continuous 64-channel EEG and sends commands to external software and hardware, under real-time latency limits.
role: Designer & lead · doctoral research
tags: [PyTorch, Real-time inference, EEG, Closed loop, CSC HPC]
domain: bridge
year: 2025 — now
featured: true
size: lg
order: 1
---

## What it does
A brain–computer interface that runs on **continuous** data rather than on neat, pre-cut trials. Hybrid neural networks detect error-related brain responses as they happen, and the output drives external software and hardware in a closed loop.

## My part
I designed and lead the 64-channel EEG study and built the pipeline end to end:

- **Acquisition:** streaming 64-channel EEG.
- **Causal preprocessing:** only past samples are used, so the same code runs offline and live.
- **Classification:** hybrid deep networks, compared against classical ML baselines.
- **Command output:** classifier decisions trigger actions in external software and hardware, including RF metasurfaces built with Aalto University.

## The hard parts
- **Latency vs. accuracy.** Every preprocessing step has to be causal and fast enough for a live loop. Many standard offline EEG steps are neither.
- **Signal drift.** EEG changes across sessions, so the pipeline adapts online instead of assuming a fixed model.
- **Does deep learning earn its cost?** Every architecture is benchmarked against classical baselines for accuracy, latency, stability and compute. The experiments run as parallel batch jobs on CSC supercomputers.
