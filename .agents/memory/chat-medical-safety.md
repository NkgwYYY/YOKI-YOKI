---
name: Chat medical safety
description: App Review requirements for health-related AI chat responses and product metadata.
---

YOKI YOKI's AI chat must not diagnose conditions or direct treatment, medication, dosage, reduction, or discontinuation. Every generated reply must display easy-to-find links to authoritative public-health sources, even when the conversation appears casual.

**Why:** Apple treated general mental-health suggestions in Chat as medical information and rejected the app under Guideline 1.4.1 because recommendations lacked visible citations and the App Store description lacked a doctor-consultation disclaimer.

**How to apply:** Keep the in-chat medical disclaimer visible, attach official citations to each assistant response, and preserve server-side safety instructions for health and crisis topics. The App Store description must also tell users to consult a doctor in addition to using the app and before making medical decisions; an in-app notice alone does not satisfy that metadata requirement.