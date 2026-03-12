# WRP_OpsMgmt

This is a Next.js application for managing and exploring datasets. It utilizes Genkit for AI-powered data cleaning and PostgreSQL for persistent data storage.

## Features

*   **Data Upload:** Upload data in JSON format (single objects or arrays).
*   **Dataset Management:**
    *   Create new datasets from uploaded data.
    *   Replace existing datasets.
    *   Switch between different datasets using a dropdown.
*   **Data Preview:** View data entries and their relationships in a table.
*   **Data Filtering:** Filter the data preview based on relationships (Source ID).
*   **Data Detail View:** Inspect individual data entries.
*   **Manual Editing:** Edit data entries directly via a JSON editor.
*   **AI Data Cleaning:** Use Genkit (Google AI) to suggest and apply data cleaning transformations.
*   **Relationship Management:** Define and view relationships between data entries within a dataset.
*   **Persistent Storage:** Uses PostgreSQL to store datasets, entries, and relationships.
*   **Admin Panel:** Unified dashboard for managing property management services.
*   **Task Templates:** Create and manage templates for recurring tasks.
*   **Work Orders:** Track and manage work order progress and associated tasks.

## Getting Started (Docker Beginners Guide)

If you are new to IT and want the easiest way to get this application running, we recommend using Docker. Docker packages the application and its database so you don't have to install them manually.

### Prerequisites for Docker Setup

1.  **Install Docker Desktop:** Download and install Docker Desktop for your operating system (Windows, Mac, or Linux) from [docker.com](https://www.docker.com/products/docker-desktop/). Ensure Docker Desktop is running.
2.  **Get a Google Gemini API Key:** To use the AI data cleaning features, you need a free API key from Google.
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Sign in with a Google account.
    *   Click "Get API key" and create a new key. Save this key somewhere safe.

### Step-by-Step Instructions

1.  **Open your Terminal or Command Prompt:**
    *   Windows: Search for `cmd` or `PowerShell`.
    *   Mac: Search for `Terminal`.
2.  **Navigate to the project folder:**
    Use the `cd` command to change directories to where you downloaded or cloned this project.
    ```bash
    cd path/to/WRP_OpsMgmt
    ```
3.  **Create your Environment File (`.env`):**
    The application needs a configuration file to know how to connect to the database and use the AI.
    *   Create a new plain text file in the root of the project folder and name it exactly `.env` (don't forget the dot at the beginning).
    *   Open the `.env` file in any text editor (like Notepad or TextEdit) and paste the following, replacing `YOUR_API_KEY_HERE` with the key you got from Google AI Studio:

    ```dotenv
    # Database Configuration for Docker
    POSTGRES_HOST=db
    POSTGRES_PORT=5432
    POSTGRES_USER=wrpops_user
    POSTGRES_PASSWORD=secure_password_123
    POSTGRES_DATABASE=wrpops_db

    # Google AI Key
    GOOGLE_GENAI_API_KEY=YOUR_API_KEY_HERE
    ```
    *(Note: If you change the database credentials here, you must also update the `docker-compose.yml` file to match. For a beginner setup, leaving them as shown above is easiest).*

4.  **Start the Application:**
    Run the following command in your terminal. This will download the necessary parts and start the application. It might take a few minutes the first time.
    ```bash
    docker compose up --build -d
    ```
    *(The `-d` runs it in the background so you can still use your terminal).*

5.  **Access the App:**
    Once it finishes, open your web browser and go to:
    **http://localhost:3000**

6.  **Stop the Application:**
    When you are done, you can stop the application by running:
    ```bash
    docker compose down
    ```

---

## Getting Started (Manual Setup for Developers)

### Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js (v18 or later recommended) and npm installed.
2.  **PostgreSQL:** Install PostgreSQL server (v12 or later recommended) and **ensure it is running**. You can install it locally or use a managed service.
3.  **Git:** (Optional, for cloning if not already done).

### Setup

1.  **Clone the Repository (if needed):**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure PostgreSQL:**
    *   **Start your PostgreSQL server.** This is a common cause of connection errors. Check your operating system's services or use commands like `pg_ctl start` (depending on your installation method).
    *   Create a PostgreSQL database (e.g., `wrpops_db`).
    *   Create a PostgreSQL user and grant privileges to the database (e.g., `your_db_user`). Make note of the password.
    *   You can use tools like `psql` or graphical clients (pgAdmin, DBeaver) for this. Example `psql` commands:
        ```sql
        -- Connect to PostgreSQL as a superuser (like 'postgres')
        -- sudo -u postgres psql

        CREATE DATABASE wrpops_db;
        CREATE USER your_db_user WITH PASSWORD 'your_db_password';
        GRANT ALL PRIVILEGES ON DATABASE wrpops_db TO your_db_user;

        -- Optional: If schema 'public' needs explicit grants (less common):
        -- \c wrpops_db
        -- GRANT ALL ON SCHEMA public TO your_db_user;
        -- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_db_user; -- For existing tables
        -- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_db_user; -- For future tables
        ```
    *   **Verify Connection Settings:** Ensure your PostgreSQL server is configured to accept connections from `localhost` (or the host specified in `.env`) on the correct port (usually `5432`). Check the `postgresql.conf` and `pg_hba.conf` files in your PostgreSQL data directory if you encounter connection issues.

4.  **Configure Environment Variables:**
    *   Create a file named `.env` in the root of the project (if it doesn't exist).
    *   Copy the contents from `.env.example` (if provided) or add the following, **carefully replacing the placeholder values** with your actual PostgreSQL connection details:
        ```dotenv
        # PostgreSQL Connection Details
        # Ensure these values match your running PostgreSQL server configuration.
        POSTGRES_HOST=localhost # Or your DB host address (e.g., 127.0.0.1)
        POSTGRES_PORT=5432      # Or the port your PostgreSQL server is listening on
        POSTGRES_USER=your_db_user
        POSTGRES_PASSWORD=your_db_password
        POSTGRES_DATABASE=wrpops_db

        # Optional: Google Generative AI API Key (if using AI Cleaning)
        # Obtain an API key from Google AI Studio (https://aistudio.google.com/)
        # GOOGLE_GENAI_API_KEY=YOUR_API_KEY
        ```
    *   **Important:** Add `.env` to your `.gitignore` file to avoid committing sensitive credentials.

5.  **Run Database Schema Initialization (and Development Server):**
    The database tables are created automatically when the application starts. Run the development server:
    ```bash
    npm run dev
    ```
    The application should now be running, typically at `http://localhost:9002`. Check the terminal output for messages about database schema initialization. If you encounter connection errors (like `ECONNREFUSED`), see the troubleshooting section below.

6.  **(Optional) Run Genkit Development Server (for AI features):**
    If you plan to use or develop the AI cleaning features locally, run the Genkit server in a separate terminal:
    ```bash
    npm run genkit:dev
    # Or for auto-reloading on changes:
    # npm run genkit:watch
    ```
    Make sure you have set the `GOOGLE_GENAI_API_KEY` in your `.env` file for Genkit to work.

## Docker Support

You can also run the application using Docker and Docker Compose. This simplifies the setup by running the application and the PostgreSQL database in containers.

1.  **Build and run the containers:**
    ```bash
    docker compose up --build
    ```

2.  **Access the application:**
    Open your browser and navigate to `http://localhost:3000`.

3.  **Stop the containers:**
    ```bash
    docker compose down
    ```

### Troubleshooting Connection Errors (`ECONNREFUSED`)

If you see a "connect ECONNREFUSED 127.0.0.1:5432" (or similar host/port) error in the terminal when starting the app (`npm run dev`), it means the application could not establish a connection to the PostgreSQL server. Check the following:

1.  **Is PostgreSQL Running?**
    *   Use your system's tools (Task Manager on Windows, Activity Monitor on macOS, `services.msc` on Windows, `systemctl status postgresql` or `service postgresql status` on Linux) to confirm the PostgreSQL server process is active.
    *   If it's not running, start it. (e.g., `sudo systemctl start postgresql`, `pg_ctl start -D /path/to/data/directory`).

2.  **Correct `.env` Settings?**
    *   Double-check `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DATABASE` in your `.env` file.
    *   They must **exactly match** your PostgreSQL setup. Common mistakes include typos, incorrect passwords, or wrong database names.
    *   Ensure the `.env` file is in the project's root directory and the app was restarted after changes.

3.  **Correct Port?**
    *   Is PostgreSQL listening on the port specified in `POSTGRES_PORT` (default is `5432`)?
    *   Check your `postgresql.conf` file (location varies by OS/installation method - find it using `psql -U postgres -c 'SHOW config_file;'`). Look for the `port` setting.
    *   Ensure the `.env` file `POSTGRES_PORT` matches this value.

4.  **Listening Address (`listen_addresses`)?**
    *   Is PostgreSQL configured to listen on the address specified in `POSTGRES_HOST` (default `localhost`)?
    *   Check the `listen_addresses` setting in `postgresql.conf`.
    *   For local development connecting from the same machine, `localhost` or `127.0.0.1` is usually correct. If `listen_addresses` is set to something else (or commented out with a default that doesn't include `localhost`), the connection might fail. Setting it to `'*'` listens on all interfaces (use with caution, consider security implications). You might need to restart the PostgreSQL server after changing this file.

5.  **Firewall?**
    *   Is a firewall (Windows Firewall, `ufw` on Ubuntu, `firewalld` on CentOS, macOS firewall) blocking incoming connections to the PostgreSQL port (`5432` by default)?
    *   Try temporarily disabling the firewall to test, or add a specific rule to allow connections on the PostgreSQL port.

6.  **Authentication (`pg_hba.conf`)?**
    *   This file controls which hosts are allowed to connect, which users can connect, which databases they can access, and the authentication method required.
    *   Find `pg_hba.conf` (usually in the same directory as `postgresql.conf`).
    *   Look for lines that match your connection attempt. For a local connection from the app using user `your_db_user` to database `wrpops_db`, you'll need a line similar to:
        ```
        # TYPE  DATABASE        USER            ADDRESS                 METHOD
        host    wrpops_db   your_db_user    127.0.0.1/32            md5   # Or scram-sha-256
        # or for connections via local Unix socket (common on Linux/macOS if HOST is localhost)
        # local   wrpops_db   your_db_user                            md5   # Or scram-sha-256
        ```
    *   `127.0.0.1/32` allows connections specifically from the IPv4 loopback address. `::1/128` would be for IPv6.
    *   The `METHOD` (e.g., `md5`, `scram-sha-256`) determines how the password is verified. Ensure it matches what your setup expects. `trust` allows connection without a password (not recommended for production).
    *   You might need to reload the PostgreSQL configuration after changing this file (e.g., `sudo systemctl reload postgresql` or `pg_ctl reload`).

7.  **Database/User Exists?**
    *   Confirm that the database (`wrpops_db`) and user (`your_db_user`) actually exist in PostgreSQL and that the user has connection privileges. Use `psql` or a GUI tool to verify.

By checking these points systematically, you should be able to identify and resolve the `ECONNREFUSED` error. Check the application startup logs for more detailed connection error messages and troubleshooting tips.

### Project Structure

*   `src/app/`: Next.js App Router pages and layouts.
*   `src/components/`: Reusable React components (UI, forms, etc.).
*   `src/actions/`: Next.js Server Actions for backend operations.
*   `src/services/`: Backend logic, including `database.ts` for PostgreSQL interactions.
*   `src/ai/`: Genkit related code (flows, configuration).
*   `src/lib/`: Utility functions.
*   `src/hooks/`: Custom React hooks.
*   `.env`: Environment variable configuration (ignored by git).
*   `public/`: Static assets.

## Usage

1.  **Open the application:** Navigate to `http://localhost:9002` (or your configured port).
2.  **Upload Data:** Use the "Upload New Data" form. Paste valid JSON (a single object or an array of objects).
3.  **Confirm Upload:** Choose an action in the dialog:
    *   **Add/Update in Active Set:** Adds new entries or updates existing ones based on ID in the currently selected dataset.
    *   **Amend Specific Entry:** Replaces the data for a specific ID in the active dataset (requires single object upload without an 'id' field in the JSON).
    *   **Create/Replace Data Set:** Creates a new dataset or overwrites an existing one with the uploaded data. Sets the new/replaced dataset as active.
4.  **Switch Datasets:** Use the dropdown in the "Data Preview" section to switch between available datasets. The data preview will update automatically.
5.  **Filter Data:** Enter a Source Entry ID in the filter input and click "Filter" to see only entries related to that source ID. Click "Clear" to remove the filter.
6.  **View/Clean Data:** Click the "View / Clean" button on a row in the preview table to navigate to the detail page for that entry.
7.  **Detail Page:**
    *   View the full data entry.
    *   Click "Edit" to manually modify the JSON data.
    *   Click "Clean Data with AI" to get cleaning suggestions (requires Genkit setup and API key). Apply valid suggestions.
    *   Add relationships to other entries by entering the Target Entry ID and clicking "Add Relationship".
    *   View related entries in the table below. Click "Edit Headers" to customize the columns shown for related entries.

## Further Development

*   Implement relationship deletion.
*   Add more sophisticated data visualization options.
*   Enhance error handling and user feedback.
*   Implement user authentication and authorization if needed.
*   Add database migrations for schema changes (using tools like `node-pg-migrate`).
*   Improve AI cleaning prompts and capabilities.

