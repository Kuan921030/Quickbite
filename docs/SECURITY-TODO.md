# QuickBite 商用安全升級待辦清單 (SECURITY-TODO)

本文件列出了 QuickBite 在從 MVP 測試版邁向正式商用前，**必須**完成的安全機制升級。目前 MVP 階段的點數、點餐、評價與優惠券功能均在前端與客戶端庫中完成，僅作為展示與體驗用途。

---

## 🔒 核心升級項目

### 1. 建立可信任後端 (Cloud Functions / App Engine)
* **現狀**：點數增減、點餐紀錄和優惠券兌換直接在前端呼叫 Firestore 客戶端 SDK 更新。
* **商用升級**：所有敏感業務邏輯（如扣除點數、核銷優惠券）應全部移至**可信任後端**（例如 Firebase Cloud Functions 或獨立 API 伺服器）。前端僅能透過 HTTPS Callable 或是 API Endpoint 觸發操作，由後端使用 Firebase Admin SDK 驗證與寫入。

### 2. 點數原子增減 (Atomic Operations)
* **現狀**：點數更新是讀取目前點數、在前端做加減後再覆寫回 Firestore（Read-Modify-Write），容易產生 Race Conditions（競態條件）。
* **商用升級**：改用 Firestore 的 `FieldValue.increment()` 進行原子增減，或在後端使用 `runTransaction` 確保交易的 ACID 特性，避免使用者透過併發請求刷取點數。

### 3. 評價獎勵防重複與速率限制 (Rate Limiting & Double-Spend Prevention)
* **現狀**：使用者點擊評價即可無限次在前端增加 50 點。
* **商用升級**：
  * 限制每筆訂單只能進行一次評價並獲得一次獎勵。
  * 後端必須記錄「已評價訂單/店家」的關係對應表，每次評價請求時，先檢查該訂單/時間區段內是否已發放過點數。
  * 加入 IP 或 Uid 級別的 API 速率限制 (Rate Limiting)，防範腳本惡意刷點。

### 4. 優惠券兌換安全交易 (Secure Coupon Redemption)
* **現狀**：扣除 100 點並隨機生成一個 redemptions 紀錄，完全由前端控制。
* **商用升級**：
  * 在後端進行 Transaction：先驗證使用者點數餘額是否大於等於 100，若足夠，則在同一個 Transaction 內完成「扣除使用者 100 點」與「新增一筆 claimed 優惠券紀錄」。
  * 優惠券的 template、折扣與代碼應在後端安全庫中，不應讓前端有寫入或擅自生成優惠券的權限。

### 5. 訂單與到訪紀錄驗證 (Order & Visit Verification)
* **現狀**：模擬點餐後自動增加 100 點、增加 1 次點餐次數，並增加 1 次到訪紀錄。
* **商用升級**：
  * 實際點餐必須經由第三方金流（如 Stripe, Line Pay）或合作店家 POS 系統確認收到款項，後端才會回呼寫入訂單與點餐次數。
  * 到訪紀錄需整合實體店家 QR Code 掃描、藍牙 Beacon 或定位座標（Geolocation）防偽驗證，確保使用者真實抵達現場才可增加到訪次數。

### 6. 鎖定 users 敏感欄位寫入權限 (Security Rules Hardening)
* **現狀**：Firestore Security Rules 允許使用者對自身的 `users/{uid}` 文件進行寫入，因此使用者有能力直接修改自身的 `points`、`tier`、`mealsOrdered` 等敏感欄位。
* **商用升級**：
  * 調整 `firestore.rules`，將敏感欄位（`points`, `tier`, `mealsOrdered`, `visitedCount`）設為唯讀：
    ```javascript
    // 範例規則示意（正式部署時採用）
    allow update: if request.auth != null && request.auth.uid == userId 
                  && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['points', 'tier', 'mealsOrdered', 'visitedCount', 'createdAt']);
    ```
  * 將這些欄位的更新權限完全交由 Cloud Functions (Admin SDK)，徹底杜絕前端竄改可能。
