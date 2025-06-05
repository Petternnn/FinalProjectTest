# QuestVerse Quiz Generator Platform

## Project Overview

The QuestVerse Quiz Generator is one of many pieces for a greater vision. It is a React-based web application designed to help educators and content creators quickly generate, review, and save quiz questions from provided text material. It leverages OpenAI's GPT-4 Turbo for intelligent question generation and Firebase for data storage and user authentication. The quizzes created can be synced with a companion mobile game prototype developed in Godot (a game engine)

**Live Deployment:** [https://questverse.netlify.app]
**GitHub Repo:** https://github.com/Petternnn/FinalProjectTest
## Core Features

*   **User Authentication:** Secure sign-up, login, and email verification powered by Firebase Authentication.
*   **AI-Powered Quiz Creation:** A multi-step wizard that:
    *   Accepts text input and quiz parameters (number of questions, grade level, language).
    *   Uses OpenAI GPT-4 Turbo to generate questions, answer options, and explanations.
    *   Allows users to review, edit, add, or delete generated Q&A pairs.
    *   Saves finalized quizzes with a title and description.
*   **Quiz Module Management:**
    *   View all created quizzes in a personal library.
    *   Expand quiz details to see all questions and answers.
    *   Delete unwanted quizzes.
*   **User Profile Settings:**
    *   Update first name and last name.
    *   Upload and manage profile pictures (hosted on Cloudinary).
    *   Profile information (including picture) is displayed in the application sidebar.
*   **Responsive Design:** Adapts to various screen sizes for usability on desktop and mobile devices.
*   **Secure & Persistent Data:**
    *   User profiles (including custom details and profile picture URLs) are stored in Cloud Firestore.
    *   Quiz content (`user_topics`) is stored in Firebase Realtime Database for easy syncing with other applications (e.g., the Godot game).

## Technology Stack

*   **Frontend:** React (Functional Components & Hooks), Vite
*   **Routing:** React Router
*   **State Management:** React Context API
*   **Styling:** CSS Modules, Global CSS with CSS Variables
*   **Animation:** Framer Motion
*   **Backend & Database:**
    *   Firebase Authentication (User Auth)
    *   Cloud Firestore (User Profiles)
    *   Firebase Realtime Database (Quiz Data / `user_topics`)
*   **APIs:**
    *   OpenAI API (GPT-4 Turbo for question generation)
    *   Cloudinary API (Image hosting for profile pictures)
*   **Version Control:** Git & GitHub
*   **Deployment:** Netlify


## Setup and Installation (Development)

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <project-directory-name>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add your Firebase, OpenAI, and Cloudinary API keys/configurations:
    ```env
    VITE_FIREBASE_API_KEY=your_firebase_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
    VITE_FIREBASE_DATABASE_URL=your_firebase_database_url
    VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
    VITE_FIREBASE_APP_ID=your_firebase_app_id
    VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

    VITE_OPENAI_API_KEY=your_openai_api_key

    VITE_CLOUDINARY_NAME=your_cloudinary_cloud_name
    ```
    *Ensure to have an upload preset named `user_profile` in your Cloudinary account for profile picture uploads.*

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:5173` (or another port if 5173 is busy).

## Figma Prototype

A Figma prototype detailing the application's design and user flow can be accessed here:
[Figma Prototype Link](https://www.figma.com/proto/Q9Ja8G9iPj1BWTckg94C97/FrontEnd-FinalProject-2025?page-id=0%3A1&node-id=1-31&viewport=326%2C411%2C0.13&t=gtnr8DOhXD7fmq3z-1&scaling=min-zoom&content-scaling=fixed&starting-point-node-id=1%3A31)

## Project Structure

The project follows a standard Vite + React structure:

*   `src/`: Contains all the application source code.
    *   `assets/`: Static assets like images and fonts.
    *   `components/`: Reusable UI components (e.g., Sidebar, Tabs, Modals).
    *   `contexts/`: React Context providers (e.g., AuthContext).
    *   `hooks/`: Custom React Hooks (e.g., useImageUpload, useOpenAiGenerationAPI, validation hooks).
    *   `pages/`: Top-level page components corresponding to routes.
    *   `Routes/`: Route definitions and protected route logic.
    *   `services/`: Firebase configuration and potentially other service integrations.
    *   `styles/`: Global styles and CSS variable definitions.

*   `index.html`: The main HTML entry point for the application.
*   `.env`: For environment variables (ensure this is in `.gitignore`).
*   `README.md`: This file.
*   `project-documentation.pdf`: Detailed project documentation.
*   `prototype.fig` (or link in README): Figma design file.
