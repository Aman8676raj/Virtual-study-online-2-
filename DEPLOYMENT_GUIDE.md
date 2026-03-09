# 🚀 Deployment Guide - Virtual Online Study Platform

## Prerequisites
- MongoDB Atlas account (free tier)
- Render.com account (free tier)
- GitHub repository (already setup ✅)

---

## Step 1: MongoDB Atlas Setup (Database)

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Click "Create" → Create a **Shared Cluster** (FREE)

### 1.2 Create Database User
1. Go to **Database Access** → **Add New Database User**
2. Create user:
   - **Username:** `cohortuser`
   - **Password:** Create a strong password
   - Click **Create User**

### 1.3 Whitelist IP Address
1. Go to **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development)
4. Confirm

### 1.4 Get Connection String
1. Click **Databases** → **Connect** button (on your cluster)
2. Choose **Drivers**
3. Copy the connection string
4. Replace `<password>` with your user password
5. **Connection String Format:**
```
mongodb+srv://cohortuser:YOUR_PASSWORD@cluster.mongodb.net/cohort?retryWrites=true&w=majority
```

---

## Step 2: Render.com Deployment

### 2.1 Create Render Account
1. Go to https://render.com
2. Sign up (GitHub recommended)
3. Click **Create New** → **Web Service**

### 2.2 Deploy Backend
1. Click **Create Web Service**
2. Connect GitHub repository (`Aman8676raj/virtual-online-study`)
3. Configure:
   - **Name:** `virtual-online-study-api` (or your choice)
   - **Environment:** `Node`
   - **Build Command:** `cd server && npm install && cd .. && cd client && npm install && npm run build && cd ..`
   - **Start Command:** `node server/index.js`
   - **Plan:** Free tier

### 2.3 Add Environment Variables
In Render dashboard, go to **Environment**:

Add these variables:
```
MONGO_URI=mongodb+srv://<db_username>:<db_password>@virtual.yq2sjc1.mongodb.net/test?retryWrites=true&w=majority&appName=Virtual
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
CLIENT_URL=https://your-render-app.onrender.com
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
PORT=5000
NODE_ENV=production
```

### 2.4 Deploy
1. Click **Deploy**
2. Wait 2-5 minutes for deployment
3. **Live URL:** `https://virtual-online-study-api.onrender.com`

---

## Step 3: Verify Deployment

### Test Backend
```bash
curl https://virtual-online-study-api.onrender.com/
# Should see: "Server is running"
```

### Seed Database (Optional)
```bash
curl https://virtual-online-study-api.onrender.com/api/seed
# Should see: "Database seeded successfully!"
```

---

## Step 4: Frontend Already Integrated! ✅

### Why No Separate Frontend Deployment?
- React build (`dist/`) is served by Express backend
- Everything runs on **one server** (efficient & cheap)
- Single deployment = Single URL

### Access Your App
➡️ **Visit:** `https://virtual-online-study-api.onrender.com`

Login with:
- **Email:** `demo@example.com`
- **Password:** `password123`

---

## Environment Variables Summary

### .env (Local Development)
```
MONGO_URI=mongodb://localhost:27017/cohort
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

### Render.com (Production)
```
MONGO_URI=mongodb+srv://<db_username>:<db_password>@virtual.yq2sjc1.mongodb.net/test?retryWrites=true&w=majority&appName=Virtual
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
CLIENT_URL=https://your-render-app.onrender.com
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
PORT=5000
NODE_ENV=production
```

---

## Troubleshooting

### Cold Start Issues
- Render.com puts free apps to sleep after 15 mins
- First request takes ~30 seconds (normal)
- Subscribe to Pro tier to keep always running

### MongoDB Connection Error
- Check IP whitelist in MongoDB Atlas
- Verify password in connection string
- Test connection string format

### Frontend Showing Error
- Check browser console (F12)
- Verify API_URL in client requests
- Check Render.com logs: **Logs** tab

---

## Update & Redeploy

### To Update Code
```bash
git add .
git commit -m "Update message"
git push origin main
```

Render.com **automatically redeploys** on GitHub push! 🔄

---

## Next Steps (Optional)

1. **Custom Domain**
   - Buy domain on GoDaddy/Namecheap
   - Add to Render.com settings

2. **Enable Google OAuth**
   - Get credentials from Google Cloud Console
   - Add to Render environment variables

3. **Scale to Pro**
   - Keep app running 24/7
   - More concurrent connections
   - Better performance

---

## Support

- Render.com Docs: https://render.com/docs
- MongoDB Docs: https://docs.mongodb.com/
- Express.js: https://expressjs.com/

**Good luck! 🚀** Let me know if you face any issues!
