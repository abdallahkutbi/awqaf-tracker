# Awqaf Tracker

Awqaf Tracker is a demo platform for managing **waqf (endowment) assets**, family/charity beneficiaries, and distribution rules.  
It’s built as a learning project to showcase how fintech/payment-style infrastructure could be applied to Islamic endowment management.

---

## ✨ Features

- **User Accounts**
  - Sign up with email + national ID
  - Passwords stored securely with bcrypt hashing
  - Owner authorization model (owner = first national ID on a waqf record)

- **Waqf Management**
  - `waqf` table stores each waqf (gov ID, type, authorized users, corpus, last-year profit, asset kind)
  - Attach authorized users to manage

- **Beneficiaries & Distribution Rules**
  - Each waqf can have beneficiaries (family members or charities)
  - Distribution rules define share (percent or fixed) for each beneficiary
  - Validation trigger prevents percent shares > 100% for a waqf

- **Preview Distributions**
  - Input a distributable amount (e.g. annual profit) → API calculates suggested allocations
  - Dashboard shows allocation per beneficiary

- **Security / Roles**
  - Only the waqf owner can add beneficiaries or rules
  - Other authorized users can view and preview distributions

---

## 🗄️ Database Schema (SQLite)

**Tables:**
- `users` → platform logins (email, national_id, password hash)  
- `waqf` → endowment master data (`wagf_gov_id`, type, assets, authorized_national_ids)  
- `beneficiaries` → recipients tied to a waqf  
- `distribution_rules` → how waqf profits get split (percent or fixed)

**Planned:**
- `payouts` → log actual transfers to beneficiaries  
- `past_profits` → keep multi-year profit history

---

## 🖥️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite (`better-sqlite3`)
- **Frontend**: Next.js 14 (TypeScript, App Router)
- **Auth**: Email + National ID (MVP, no JWT yet)
- **Infra**: Local dev, Firebase Hosting (optional deploy)

---

## 🚀 Getting Started

1. **Install deps**
   ```bash
   npm install
   cd server && npm install
   cd ../web && npm install
