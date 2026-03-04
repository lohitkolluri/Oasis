# Architecture — Oasis

This document describes the system architecture, component interactions, and data flows for the Oasis platform.

---

## System Overview

```mermaid
graph TB
    subgraph Rider["Rider (Mobile / PWA)"]
        R1[Dashboard]
        R2[Policy Subscription]
        R3[Risk Radar]
        R4[Claims History]
        R5[Location Verify]
    end

    subgraph Admin["Admin Panel"]
        A1[Triggers Dashboard]
        A2[Fraud Queue]
        A3[Analytics]
        A4[System Health]
        A5[Demo Mode]
    end

    subgraph NextJS["Next.js 15 App Router"]
        API1[/api/cron/adjudicator]
        API2[/api/admin/*]
        API3[/api/rider/*]
        API4[/api/claims/*]
        MW[Middleware / Auth]
    end

    subgraph Supabase["Supabase (Postgres + Realtime + Storage)"]
        DB[(Database)]
        RT[Realtime]
        ST[Storage]
        EF[Edge Function\nadjudicator]
    end

    subgraph External["External Data Sources"]
        TIO[Tomorrow.io\nWeather + Wind]
        OME[Open-Meteo\nAQI + Historical]
        NDA[NewsData.io\nNews Headlines]
        OAI[OpenRouter\nLLM Classifier]
    end

    subgraph Infra["Infrastructure"]
        VCL[Vercel\nHosting + Cron]
        PGC[pg_cron\nDB Scheduler]
    end

    Rider --> NextJS
    Admin --> NextJS
    NextJS --> Supabase
    NextJS --> External
    VCL -->|Cron HTTP| API1
    PGC -->|Direct SQL| DB
    RT -->|WebSocket| Rider
    EF --> DB
    EF --> External
```

---

## Request Flow: Policy Subscription

```mermaid
sequenceDiagram
    participant R as Rider
    participant UI as Next.js UI
    participant API as API Route
    participant DB as Supabase DB

    R->>UI: Select plan & click Subscribe
    UI->>API: POST /api/payments/create-order
    API->>DB: Check existing active policy
    DB-->>API: None found
    API-->>UI: Demo order ID (PAYMENT_DEMO_MODE=true)
    UI->>DB: INSERT weekly_policies (is_active=true)
    DB-->>UI: Policy created
    UI-->>R: Dashboard shows active policy
```

---

## Request Flow: Parametric Adjudicator (Core Engine)

```mermaid
flowchart TD
    START([Cron trigger\nevery 6 hours]) --> ZONES

    ZONES[Query active rider zones\nfrom profiles table] --> CLUSTER

    CLUSTER[Cluster zones into\n~10km grid cells] --> ITERATE

    ITERATE{For each\nzone cluster} --> WEATHER

    WEATHER[Fetch Tomorrow.io\nWeather API\nwind ≥ 60 km/h\nrain ≥ 50 mm] --> AQI

    AQI[Fetch Open-Meteo\n30-day historical AQI\nCompute adaptive threshold\nP75 × 1.4] --> NEWS

    NEWS[Fetch NewsData.io\nheadlines for zone\ncity/state] --> LLM

    LLM[OpenRouter LLM\nClassify: traffic /\nsocial disruption?] --> CANDIDATES

    CANDIDATES[Merge disruption\ncandidates\ndeduplicate] --> POLICIES

    POLICIES[Fetch active\nweekly_policies\nfor affected zones] --> FRAUD

    FRAUD{Fraud\ndetection\nchecks} -->|Pass| PAYOUT
    FRAUD -->|Fail| FLAG

    FLAG[Mark claim\nis_flagged=true\nSet admin_review_status\n=pending] --> LOG

    PAYOUT[Insert parametric_claim\nstatus=paid\nCredit rider wallet] --> LOG

    LOG[Write to\nsystem_logs\ntable] --> DONE([Done])
```

---

## Adaptive AQI Algorithm

```mermaid
flowchart LR
    A[Fetch 30 days\nhourly AQI\nOpen-Meteo API] --> B[Build distribution\nof valid readings\nexclude nulls]
    B --> C{≥ 48 data\npoints?}
    C -->|Yes| D[Sort ascending\nCompute P75\ncompute mean]
    C -->|No| E[Use fallback\nthreshold = 201]
    D --> F[adaptive_threshold =\nmax 150, min P75×1.4, 400]
    F --> G{Current AQI\n≥ threshold?}
    E --> G
    G -->|Yes| H[Calculate severity\n6–10 scale\nbased on excess ratio]
    G -->|No| I[No trigger]
    H --> J[Push candidate\nwith raw baseline\ndata for audit]
```

> **Why adaptive?** Delhi has a chronic baseline AQI of ~250–300. A fixed threshold of 201 would trigger every day — financially unsustainable. The adaptive algorithm triggers only when air quality is meaningfully *worse than normal for that city*.

---

## Fraud Detection Pipeline

```mermaid
flowchart TD
    CLAIM[New claim candidate] --> D1

    D1{Duplicate\ncheck\nsame policy+event} -->|Duplicate| REJECT
    D1 -->|OK| D2

    D2{Weekly cap\ncheck\n≤ max_claims_per_week} -->|Exceeded| FLAG
    D2 -->|OK| D3

    D3{Weather\nmismatch\nAQI vs adaptive threshold} -->|Mismatch| FLAG
    D3 -->|OK| D4

    D4{Device\nfingerprint\nsame device, distant zones, 1h} -->|Anomaly| FLAG
    D4 -->|OK| D5

    D5{Cluster\nanomaly\n≥5 claims < 10 min} -->|Anomaly| FLAG
    D5 -->|OK| D6

    D6{Historical\nbaseline\n3× rolling 4-week avg} -->|Spike| FLAG
    D6 -->|OK| APPROVE

    FLAG[is_flagged=true\nadmin_review_status=pending] --> SAVE
    APPROVE[is_flagged=false] --> SAVE
    REJECT[Discard claim] --> END
    SAVE[Insert claim to DB] --> END([End])
```

---

## Database Entity Relationships

```mermaid
erDiagram
    profiles {
        uuid id PK
        text full_name
        text email
        text phone
        text platform
        numeric zone_latitude
        numeric zone_longitude
        timestamptz updated_at
    }

    weekly_policies {
        uuid id PK
        uuid profile_id FK
        uuid plan_id FK
        numeric premium_paid_inr
        date week_start_date
        date week_end_date
        boolean is_active
        text payment_reference
    }

    plan_packages {
        uuid id PK
        text slug
        text name
        numeric weekly_premium_inr
        numeric payout_per_claim_inr
        int max_claims_per_week
        boolean is_active
    }

    live_disruption_events {
        uuid id PK
        text event_type
        text event_subtype
        int severity_score
        jsonb geofence_polygon
        jsonb raw_api_data
        timestamptz created_at
    }

    parametric_claims {
        uuid id PK
        uuid policy_id FK
        uuid disruption_event_id FK
        numeric payout_amount_inr
        text status
        boolean is_flagged
        text device_fingerprint
        jsonb fraud_signals
        text admin_review_status
        text reviewed_by
        timestamptz reviewed_at
    }

    claim_verifications {
        uuid id PK
        uuid claim_id FK
        uuid profile_id FK
        numeric verified_lat
        numeric verified_lng
        text status
        boolean declaration_confirmed
    }

    rider_delivery_reports {
        uuid id PK
        uuid profile_id FK
        numeric zone_lat
        numeric zone_lng
        text message
        timestamptz created_at
    }

    system_logs {
        uuid id PK
        text event_type
        text severity
        jsonb metadata
        timestamptz created_at
    }

    premium_recommendations {
        uuid id PK
        uuid profile_id FK
        text recommended_plan
        numeric suggested_premium
        date week_start_date
    }

    profiles ||--o{ weekly_policies : "has"
    plan_packages ||--o{ weekly_policies : "used by"
    weekly_policies ||--o{ parametric_claims : "triggers"
    live_disruption_events ||--o{ parametric_claims : "causes"
    parametric_claims ||--o{ claim_verifications : "verified by"
    profiles ||--o{ rider_delivery_reports : "submits"
    profiles ||--o{ premium_recommendations : "receives"
```

---

## Component Architecture (Frontend)

```mermaid
graph TD
    subgraph Pages["App Router Pages"]
        P1[/dashboard]
        P2[/dashboard/policy]
        P3[/dashboard/claims]
        P4[/admin]
        P5[/admin/triggers]
        P6[/admin/fraud]
        P7[/admin/analytics]
        P8[/admin/health]
    end

    subgraph RiderComponents["Rider Components"]
        RC1[DashboardContent]
        RC2[PolicyCard]
        RC3[RealtimeWallet]
        RC4[RiskRadar]
        RC5[RiderInsight]
        RC6[ClaimVerificationPrompt]
        RC7[ReportDeliverySection]
        RC8[PlatformStatus]
    end

    subgraph AdminComponents["Admin Components"]
        AC1[AdminInsights]
        AC2[TriggersList]
        AC3[FraudList]
        AC4[AnalyticsCharts]
        AC5[SystemHealth]
        AC6[DemoTriggerButton]
        AC7[RunAdjudicatorButton]
        AC8[AdminRiderActions]
    end

    P1 --> RC1
    RC1 --> RC2
    RC1 --> RC3
    RC1 --> RC4
    RC1 --> RC5
    RC1 --> RC6
    RC1 --> RC7
    RC1 --> RC8

    P4 --> AC1
    P4 --> AC6
    P4 --> AC5
    P5 --> AC2
    P6 --> AC3
    P7 --> AC4
    P8 --> AC5
```

---

## Real-Time Data Flow

```mermaid
sequenceDiagram
    participant DB as Supabase DB
    participant RT as Supabase Realtime
    participant W as Rider Wallet Component
    participant UI as Dashboard UI

    DB->>RT: parametric_claims INSERT
    RT->>W: WebSocket event (INSERT)
    W->>W: Increment balance
    W->>UI: Re-render wallet balance
    UI-->>Rider: Live payout notification
```

---

## Authentication & Authorization

```mermaid
flowchart LR
    REQ[Incoming Request] --> MW[Next.js Middleware]
    MW --> AUTH{Supabase\nSession Valid?}
    AUTH -->|No| LOGIN[Redirect to /login]
    AUTH -->|Yes| ROUTE{Route type?}
    ROUTE -->|/admin/*| ADMINCHK{Email in\nADMIN_EMAILS\nenv var?}
    ROUTE -->|/dashboard/*| RIDER[Serve rider page]
    ADMINCHK -->|Yes| ADMIN[Serve admin page]
    ADMINCHK -->|No| DENIED[403 Forbidden]
```

---

## Deployment Architecture

```mermaid
graph LR
    subgraph Vercel["Vercel (Production)"]
        NX[Next.js Serverless\nFunctions]
        CRON[Vercel Cron\nScheduler]
    end

    subgraph Supabase["Supabase Cloud"]
        PG[(Postgres 15)]
        RT2[Realtime Server]
        EDGE[Edge Functions\nDeno Runtime]
        PGC2[pg_cron\nScheduler]
        S3[Storage Buckets]
    end

    subgraph External2["External APIs"]
        TIO2[Tomorrow.io]
        OME2[Open-Meteo]
        NDA2[NewsData.io]
        OAI2[OpenRouter\nLlama 3.1]
    end

    CRON -->|POST /api/cron/adjudicator| NX
    CRON -->|POST /api/cron/weekly-premium| NX
    PGC2 -->|Direct DB function| PG
    NX <--> PG
    NX --> TIO2
    NX --> OME2
    NX --> NDA2
    NX --> OAI2
    EDGE <--> PG
    EDGE --> TIO2
    EDGE --> OME2
    EDGE --> NDA2
    EDGE --> OAI2
    NX <--> S3
```
