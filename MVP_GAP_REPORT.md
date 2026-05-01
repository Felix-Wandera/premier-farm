# Premier Farm MVP Gap Report

This document outlines the current state of features in the Premier Farm application, identifies the gaps preventing them from reaching Minimum Viable Product (MVP) status, and provides actionable steps to complete them.

## 1. Herd Management
**Current State:**
- Users can view a list of animals in the Herd Directory.
- Users can add a new animal via a multi-step wizard.
- Users can view an individual animal's profile, including its genealogy, milk logs, health records, and breeding events.

**Gaps & Half-Implemented Features:**
- **Edit Animal Details:** The "Edit Profile" button on the Animal Profile page (`ClientAnimalProfile.tsx`) is a dummy button with no action attached. Users cannot update an animal's tag number, name, species, gender, or date of birth after creation.
- **Animal Status Transitions:** While an animal's status can be set to `ACTIVE` or `SICK`, there is no dedicated flow for marking an animal as `DECEASED` (including logging the `dateOfDeath` and `causeOfDeath`) or `SOLD` (linking to a sale record).
- **Offspring Visibility:** Offspring are fetched in the backend (`getAnimalProfile`) but are not visibly rendered in the "Info" tab of the animal profile.

**Actionable Steps:**
- [ ] Implement an `EditAnimalModal` component and hook it up to the Edit button in `ClientAnimalProfile.tsx`.
- [ ] Create a server action to update animal details.
- [ ] Add a UI flow to handle marking an animal as deceased or sold.
- [ ] Render the animal's offspring list in the genealogy section of the Animal Profile.

## 2. Breeding & Health
**Current State:**
- The Breeding Hub displays a timeline of upcoming events (next 7 days, next 30 days) fetched from the database.

**Gaps & Half-Implemented Features:**
- **No Creation Forms:** There is no UI to actually create a Breeding Event (e.g., Insemination, Birth) or a Health Record (e.g., Vaccination, Treatment). The Quick Add Menu "Health Event" links to `/breeding`, which just loops back to the hub with no way to add data.
- **Dummy "Mark Complete":** The "Mark Complete" button on warning events in the timeline just triggers a dummy toast notification (`toast("Event marked complete", "success")`) and does not update the database.

**Actionable Steps:**
- [ ] Build a `NewBreedingEventModal` and a `NewHealthRecordModal`.
- [ ] Create corresponding server actions (`createBreedingEvent`, `createHealthRecord`).
- [ ] Wire the Quick Add Menu and the Floating Action Button in `ClientBreedingHub.tsx` to open these modals.
- [ ] Implement the "Mark Complete" functionality to actually update the event status in the database.

## 3. Milk Production
**Current State:**
- Users can log milk yields for multiple cows in a batch session (Morning/Evening).
- An aggregated history tab shows total yields per session.

**Gaps & Half-Implemented Features:**
- **No Editing/Deleting:** Users cannot edit or delete mistakenly entered milk logs.
- **Analytics:** There is no way to view milk production trends or analytics for a specific cow, aside from a raw timeline in the cow's profile.

**Actionable Steps:**
- [ ] Add functionality to edit or delete existing milk logs in the history tab.
- [ ] (Optional for MVP, but recommended) Add a basic chart in the Animal Profile to visualize a cow's milk yield over time.

## 4. Inventory
**Current State:**
- Users can add new inventory items and view stock levels.
- A transaction ledger displays the history of stock in/out.

**Gaps & Half-Implemented Features:**
- **Hardcoded Quantities:** In `ClientInventory.tsx`, the quick action buttons (+ / -) for stocking in and out hardcode the quantity to `1` (`transactInventory({ itemId, type, quantity: 1 })`). There is no UI to input a specific quantity, making bulk updates tedious.
- **No Item Management:** Users cannot edit an existing inventory item's name, unit, or threshold. Users cannot delete an item.

**Actionable Steps:**
- [ ] Replace the simple (+ / -) buttons with a `StockTransactionModal` that allows the user to input an exact quantity to add or remove.
- [ ] Implement an `EditItemModal` and delete functionality for inventory items.

## 5. Sales & Finances
**Current State:**
- Users can record income and expenses.
- A dashboard displays total income, expenses, net cash flow, and recent transactions.

**Gaps & Half-Implemented Features:**
- **Dummy Filter:** The filter button in the header (`ClientSalesFinances.tsx`) is a dummy button with no functionality.
- **Unlinked Animal Sales:** The "Animal Sales" category does not link to a specific animal record. Selling an animal financially does not automatically update the animal's status in the herd to `SOLD`.
- **No Editing/Deleting:** Transactions cannot be edited or deleted once recorded.

**Actionable Steps:**
- [ ] Implement transaction filtering (by date range, type, or category).
- [ ] Add functionality to edit or delete transactions.
- [ ] Create a specific "Sell Animal" flow that simultaneously records the financial transaction and updates the animal's status.

## 6. Settings & General UI
**Current State:**
- A settings page exists with profile updates, theme toggling, and push notification toggles.

**Gaps & Half-Implemented Features:**
- **Dummy Buttons:** The "Help & FAQ" button in Settings just fires a dummy toast.

**Actionable Steps:**
- [ ] Provide actual content or external links for the Help & FAQ section.
- [ ] Ensure all dummy toasts are replaced with actual functionality or removed for MVP launch.

## Phased Implementation Plan

To effectively address the gaps and reach Minimum Viable Product (MVP) status, the following phased implementation plan is recommended. This plan prioritizes core data integrity and essential workflows before moving on to optional features and refinements.

### Phase 1: Core Data Integrity & Basic Workflows
*Focus: Ensure users can reliably edit and manage the primary entities (Animals, Inventory) and correct data entry errors.*
1. **Herd Management - Edit & Status:**
   - Implement `EditAnimalModal` and server actions to update animal details.
   - Implement the flow for marking an animal as `DECEASED` or `SOLD`.
2. **Milk Production - Editing Logs:**
   - Add the ability to edit or delete existing milk logs in the history tab.
3. **Inventory - Granular Control:**
   - Replace the `+`/`-` buttons with a `StockTransactionModal` for exact quantity inputs.
   - Add `EditItemModal` to allow renaming and updating inventory items.

### Phase 2: Expanding Key Workflows
*Focus: Enable users to log operational events (Breeding, Health) and ensure financial records are accurate.*
1. **Breeding & Health - Data Entry:**
   - Create `NewBreedingEventModal` and `NewHealthRecordModal`.
   - Wire up Quick Add menu to these modals.
   - Implement "Mark Complete" functionality for timeline events.
2. **Sales & Finances - Refinement:**
   - Implement transaction filtering (by date, type, category).
   - Add functionality to edit or delete recorded transactions.

### Phase 3: Integration & Polish
*Focus: Connect related features (e.g., Sales to Herd) and polish the UI/UX.*
1. **Sales & Finances - Animal Linking:**
   - Create a specific "Sell Animal" flow that links the financial transaction to the animal record and updates its status.
2. **Herd Management - Genealogy UI:**
   - Render the animal's offspring list in the "Info" tab of the Animal Profile.
3. **Settings & General UI - Cleanup:**
   - Provide actual content/links for Help & FAQ.
   - Remove or replace any remaining dummy buttons/toasts across the application.
   - (Optional) Add a basic milk yield chart to the Animal Profile.
