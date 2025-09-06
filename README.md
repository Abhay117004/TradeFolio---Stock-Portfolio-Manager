# TradeFolio

TradeFolio is a web-based portfolio management and financial news application. It enables users to track investments, view real-time market data, and stay updated with the latest financial news using data from multiple sources.

## Features

- Portfolio tracking and management
- Real-time stock and market data (via yfinance API on RapidAPI)
- Financial news aggregation
- User authentication and secure data storage

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (JS), Vite for local development
- **Backend:** Python
- **Database:** Supabase
- **APIs:** 1. Real-Time Finance Data API (via RapidAPI, aggregates data from Google Finance and other sources)
            2. Real-Time News Data(via RapidAPI, aggregates data from Google News)
         
## Prerequisites

- Node.js & npm
- Python 3.x
- Supabase account
- RapidAPI account

## Folder Structure

```
TradeFolio/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── routes/
│   └── utils/
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── pages/
│   │   ├── scripts/
│   │   │   ├── config/
│   │   │   │   └── supabase.js
│   │   │   ├── auth/
│   │   │   └── utils/
│   │   ├── styles/
│   │   └── ...
│   └── ...
├── .env
├── .gitignore
├── README.md
└── requirements.txt
```

## Environment Variables

Required in `.env`:

- `RAPIDAPI_KEY`: RapidAPI key for market data
- `RAPIDAPINEWS_KEY`: RapidAPI key for news
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_KEY`: Supabase anon/public key
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

**Do not commit your `.env` or `supabase.js` file to GitHub.**

## Supabase Client Setup

Create `frontend/src/scripts/config/supabase.js` with the following code:

```javascript
// frontend/src/scripts/config/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Key are required. Please check the values in supabase.js.");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abhay117004/TradeFolio---Stock-Portfolio-Manager.git
   cd TradeFolio---Stock-Portfolio-Manager
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up Python backend:**
   - Create a virtual environment:
     ```bash
     python -m venv venv
     ```
   - Activate the virtual environment and install requirements:
     ```bash
     # On Windows
     venv\Scripts\activate
     # On macOS/Linux
     source venv/bin/activate
     pip install -r requirements.txt
     ```

4. **Set up environment variables:**
   - Copy `.env` and fill in your own API keys and Supabase credentials.

5. **Configure Supabase client:**
   - Create `frontend/src/scripts/config/supabase.js` as shown above.

6. **Start the backend:**
   ```bash
   python -m backend.app
   ```

7. **Start the frontend:**
   ```bash
   npm run dev
   ```

8. **Access the app:**
   - Open your Flask link

## Usage

1. **Start the backend:**
   ```bash
   python -m backend.run
   ```

2. **Start the frontend:**
   ```bash
   npm run dev
   ```

3. **Access the app:**
   - Open your Vite Link

## Environment Variables

Required in `.env`:

- `RAPIDAPI_KEY`: RapidAPI key for market data
- `RAPIDAPINEWS_KEY`: RapidAPI key for news
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_KEY`: Supabase anon/public key
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abhay117004/TradeFolio---Stock-Portfolio-Manager.git
   cd TradeFolio---Stock-Portfolio-Manager
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up Python backend:**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   - Copy `.env.example` to `.env.local` and fill in your actual API keys
   - Copy `frontend/src/scripts/config/supabase.example.js` to `frontend/src/scripts/config/supabase.js` and add your credentials

5. **Start the services:**
   ```bash
   # Backend:
   python -m backend.app
   
   # Frontend (new terminal):
   npm run dev
   ```

**Note:** Never commit your `.env.local` or actual `supabase.js` files to version control.



