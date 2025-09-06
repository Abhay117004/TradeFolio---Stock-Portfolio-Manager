# TradeFolio - Portfolio Management & Financial News Platform

<div align="center">

*A comprehensive web-based portfolio management and financial news application built with Python, Flask, and Supabase.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green.svg)](https://supabase.io/)

</div>

## 📖 Table of Contents

- [About TradeFolio](#-about-tradefolio)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## 🚀 About TradeFolio

TradeFolio is a full-stack web application designed to help users manage their investment portfolios, track real-time market data, and stay informed with the latest financial news. It combines a powerful Python/Flask backend with a responsive Vite-powered frontend and uses Supabase for secure data storage and authentication.

## ✨ Features

- **Portfolio Management**: Track your investments and monitor overall performance
- **Real-time Market Data**: Access up-to-date stock prices and market information via RapidAPI
- **Financial News Aggregation**: Stay informed with the latest news from top financial sources
- **Secure Authentication**: User accounts are secured using Supabase for authentication and data storage

## 🛠 Technology Stack

| Component | Technology Used |
|-----------|----------------|
| **Frontend** | HTML, CSS, JavaScript, Vite (for development) |
| **Backend** | Python, Flask |
| **Database & Auth** | Supabase (PostgreSQL) |
| **APIs** | RapidAPI (Real-Time Finance & News Data) |

## 📋 Prerequisites

### Software Requirements
- **Python**: Version 3.8 or higher - [Download](https://www.python.org/downloads/)
- **Node.js & npm**: Required only to run Vite for frontend development - [Download](https://nodejs.org/)

### Account Requirements
- **Supabase Account**: Required for the database and user authentication - [Sign up](https://supabase.io/)
- **RapidAPI Account**: Required to get API keys for financial data and news - [Sign up](https://rapidapi.com/)

## ⚡ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Abhay117004/TradeFolio---Stock-Portfolio-Manager.git
cd TradeFolio---Stock-Portfolio-Manager
```

### 2. Configure Environment Variables
Create a `.env` file in the project's root directory. Use `.env.example` as a template and add your credentials.

```env
# RapidAPI Keys
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPINEWS_KEY=your_rapidapi_news_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important**: Do not commit your `.env` file to version control.

### 3. Set Up Supabase Client
In the frontend, create the file `frontend/src/scripts/config/supabase.js` and add your Supabase credentials.

```javascript
// frontend/src/scripts/config/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "YOUR_SUPABASE_URL"; // Replace with your URL
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"; // Replace with your anon key

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Key are required.");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
```

### 4. Install Dependencies

**Backend (Python)**
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies from requirements.txt
pip install -r requirements.txt
```

**Frontend (Vite Development Server)**
```bash
# Install Vite and frontend dependencies
npm install
```

## 🚀 Usage

You need to run both the backend and frontend servers simultaneously in separate terminal windows for the application to work correctly.

### Start the Backend Server:
```bash
# Make sure your Python virtual environment is activated
python -m backend.run
# The backend will start on http://localhost:5000
```

### Start the Frontend Development Server:
```bash
# Run this command in a new terminal window
npm run dev
# Vite will serve the frontend at http://localhost:5173
```

### Access the Application:
Open your browser and navigate to the frontend URL: [http://localhost:5173](http://localhost:5173)

**Note**: Node.js is only used to run Vite for frontend development. The actual application is built with Python/Flask backend and vanilla JavaScript frontend.

## 📁 Project Structure

```
TradeFolio/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── routes/
│   ├── utils/
│   └── run.py
├── frontend/
│   ├── index.html
│   └── src/
│       ├── pages/
│       ├── scripts/
│       └── styles/
├── .env
├── .gitignore
├── README.md
└── requirements.txt
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## 📞 Contact

**Project Link**: [https://github.com/Abhay117004/TradeFolio---Stock-Portfolio-Manager](https://github.com/Abhay117004/TradeFolio---Stock-Portfolio-Manager)

**GitHub**: [@Abhay117004](https://github.com/Abhay117004)

---

<div align="center">

**⭐ Star this repository if you find it helpful! ⭐**

</div>