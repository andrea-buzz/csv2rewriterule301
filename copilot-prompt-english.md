Act as a Senior Frontend Developer. I need to build a responsive PWA (Progressive Web App) using **HTML5, TailwindCSS (via CDN), and Vanilla JavaScript**. The app generates `.htaccess` 301/302 redirect rules from a list of URLs (manually entered or imported via CSV).

**Project Constraints:**
- No frameworks (React, Vue, etc.).
- Use **IndexedDB** for storage.
- Hosting: GitHub Pages.
- Must work offline (Service Worker + Manifest).

Here are the detailed specifications and logic requirements. Please implement the solution step-by-step.

### 1. Data Structure (IndexedDB)
Create a store named `redirects` with the following schema.
- **unique_id** (String): `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
- **url_origin** (String): The source URL (cleaned).
- **url_dest** (String): The target URL (cleaned).
- **http_status** (String): Enum ['301', '302', '404', '403', '401', '200']. Default '301'.
- **pathname_only** (Boolean): If true, strips the domain from `url_dest`, keeping only path + query. Default `true`.
- **flag_qsd** (Boolean): If true, adds `[QSD]` flag to the rule (Query String Discard). Default `false`.
- **active** (Boolean): Default `true`. Set to `false` if malformed or duplicated.
- **duplicated** (Array|Boolean): `false` if unique, or an array of `unique_id`s that are duplicates.
- **malformed** (Boolean): `true` if URLs are invalid.
- **rewriterule** (String): The generated output string.

### 2. Core Logic & Validation rules
- **URL Cleaning:** Use `try { new URL(str.trim()) }` to validate. If it fails, mark row as `malformed`.
- **Loop Detection:** Check if `url_origin` matches `url_dest`. Normalize both (strip trailing slashes) before comparing. If match found, set `active = false` and alert user.
- **Duplicate Detection:** Flag rows where `url_origin` is identical to another active row.
- **Grouping:** When generating output, group rules by the **Domain** of `url_origin`.
  - Use `RewriteCond %{HTTP_HOST} ^www\.domain\.com$ [NC]` before the rules for that domain.
- **Regex Escaping:** The `url_origin` path used in `RewriteRule` must have special regex characters escaped (specifically dots `.`).
  - Example: `contact.html` becomes `contact\.html`.
- **Output Format:**
  - `RewriteRule ^source/path/?$ target [FLAGS,L]`
  - Note: `pathname_only` logic applies to the *target*.

### 3. User Interface (TailwindCSS)
- **Layout:** Header with description + collapsible "Help" section. Main area with Action Bar and Data Table.
- **Action Bar:**
  - "Import CSV" (File input).
  - "Add Row" (Manual entry).
  - "Clear All" (Wipes DB).
  - "Generate .htaccess" (Triggers validation & download).
- **Data Table:**
  - **Desktop:** Full table showing Origin, Dest, Status, Options (checkboxes for flags), and Actions (Edit/Delete).
  - **Mobile:** Convert table rows into **Cards** using Tailwind responsive classes (`hidden md:table-row`, etc.) for better readability.
- **Feedback:** Visual indicators for "Malformed" (Red bg) or "Duplicated" (Yellow bg) rows.

### 4. CSV Import Specifications
- Columns: `Origin URL`, `Destination URL`, `Status` (optional).
- On import, sanitize data, validate URLs, run duplicate checks, and save to IndexedDB.

### 5. Implementation Steps
Please generate the code in the following order:
1.  **`index.html`**: Structure + Tailwind classes.
2.  **`db.js`**: IndexedDB wrapper (Open, Add, GetAll, Update, Clear).
3.  **`app.js`**:
    - **CSV Parser:** Simple split by comma/newline (handle basic quotes).
    - **Validation Logic:** The `validateAndProcess` function.
    - **Generator Logic:** The function that groups by domain and builds the `.htaccess` string.
    - **DOM Manipulation:** Rendering the table/cards.
4.  **`sw.js` & `manifest.json`**: Basic offline support configuration.

**Specific Request for "Generate" Logic:**
When the user clicks "Generate", the app must:
1. Fetch all active rows.
2. Group them by `url_origin` hostname.
3. Iterate through groups. For each group, print the `RewriteCond`.
4. Iterate through rows in group.
   - Extract path from `url_origin` (remove leading slash).
   - Escape dots in the path.
   - Apply `pathname_only` logic to `url_dest` if flagged.
   - Construct the line: `RewriteRule ^escaped_path/?$ final_dest [R=status,FLAGS,L]`
5. Create a Blob and trigger a download of `htaccess-rules.txt`.

Let's start with the HTML structure and the IndexedDB setup.
