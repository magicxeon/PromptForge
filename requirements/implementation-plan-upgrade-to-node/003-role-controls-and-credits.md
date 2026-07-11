# Upgrade Step 3: Role Hiding & PoC Credits
**ID**: 003-role-controls-and-credits
**Target**: `ModelPromptForge`

This step covers user simulation (Role Selection in PoC), modifying the UI to show/hide the prompt preview according to the role, and implementing a simulated local credit check on the backend.

---

## 1. User Simulation & Hiding Prompts

### 1.1 UI Role Toggle
For the PoC, we will add a simple **"User Role Selector"** dropdown in the UI header:
- `Role: User` (Standard customer)
- `Role: Admin` (Developer / Administrator)

### 1.2 Hide/Show Prompt Preview logic in `app.js`
Modify `updatePromptPreview()`:
```javascript
function updatePromptPreview() {
  const previewBox = document.getElementById("prompt-preview");
  const isUserAdmin = (state.userRole === 'admin');

  if (isUserAdmin) {
    // Show compiled prompt text
    previewBox.innerHTML = generatePromptText(false);
  } else {
    // Hide prompt text, show credit status or preview placeholder
    previewBox.innerHTML = `
      <div class="user-preview-placeholder">
        <span class="preview-icon">✨</span>
        <p>Prompt compilation is hidden in User mode.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Click Generate to render character image.</p>
      </div>
    `;
  }
}
```

### 1.3 Backend Middleware for Roles
The backend will inspect the `x-user-role` HTTP header sent by the frontend:
```javascript
app.use((req, res, next) => {
  req.userRole = req.headers['x-user-role'] || 'user';
  next();
});
```
When generating images, the backend will omit the `prompt` field in the response if `req.userRole !== 'admin'`.

---

## 2. PoC Credit System
We will simulate credit check & deduction inside `server.js` using a local JSON database file `database.json` to keep track of user accounts and balances:

### 2.1 Local Database Structure (`database.json`)
```json
{
  "users": {
    "user_demo": {
      "role": "user",
      "credits": 20
    },
    "admin_demo": {
      "role": "admin",
      "credits": 9999
    }
  }
}
```

### 2.2 Credit Validation and Deduction in `/api/generate`
Before calling Google/OpenAI, the route handler must check and deduct credits:
```javascript
import fs from 'fs/promises';

async function checkAndDeductCredit(username) {
  const dbData = await fs.readFile('database.json', 'utf-8');
  const db = JSON.parse(dbData);
  
  const user = db.users[username];
  if (!user) throw new Error('User not found');
  if (user.credits <= 0) throw new Error('Insufficient credits');
  
  user.credits -= 1; // deduct 1 credit
  
  await fs.writeFile('database.json', JSON.stringify(db, null, 2));
  return user.credits;
}
```

---

## 3. UI/UX Changes for Image Presentation
- Add a **Credits Indicator** in the header (e.g. `Credits: 19 🪙`).
- Add an **Image Result Panel** under the control panel which displays the generated image once received from `/api/generate`.
- Disable "Copy Text" / "Copy JSON" buttons for standard users.

---

## 4. Verification Plan
- **Verification steps**:
  1. Login as `user_demo` via header role dropdown. Check that the Live Prompt Preview is hidden and displays the placeholder.
  2. Click `surprise me` and click `Generate Image`.
  3. Verify that the image generates successfully, credits are decremented in the header (e.g., from 20 to 19), and no raw prompt text is returned in the API network response payload.
  4. Log in as `admin_demo`. Verify that you can see the Live Prompt Preview and copy prompt buttons are functional.
