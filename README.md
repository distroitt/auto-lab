## Project Goal and Benefits

The main goal of this project is to automate and streamline the process of submitting, checking, and grading laboratory assignments for both students and teachers. Using a convenient web interface, students can submit their code and instantly receive feedback on test results, linter warnings, and AI-powered suggestions for improvement. For teachers, the platform provides efficient tools to review, manage, and assess student submissions, set laboratory requirements, and even generate custom tests automatically using AI.

---

## Prerequisites

To run the project, you will need the following installed on your system:

- **Docker**
- **Python 3+**
- **Pip package manager**
- **Python virtual environment**

---

## Setup and Running the Project

Follow these steps to set up and run the project:

1. **Create a virtual environment** in the current project directory:
   ```bash
   python3 -m venv .venv
   ```

2. **Activate the virtual environment**:
   ```bash
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set the environment variable** according to where the site will be running:  
   - For local setup:
     ```bash
     export MAIN_ENDPOINT=http://127.0.0.1:8000
     ```
   - For remote/local network setup (replace `{IP}` with your address):
     ```bash
     export MAIN_ENDPOINT=http://{IP}:8000
     ```

5. **Run the project**:
   ```bash
   uvicorn app.main:app --reload
   ```

> **Note:**  
> After launching, the site will be available locally at the URL specified in the `MAIN_ENDPOINT` environment variable.

---

## Usage Instructions

### Logging In

You can log in using your BSUIR IIS credentials.

#### For Teachers

- To gain admin privileges, ask the site administrator (or whoever is running the site) to add your student number to the administrator list.  
- The list of administrators can be modified in `app/core/config.py` by editing the `ADMINS` variable.
- As an admin, you have access to a dedicated panel where you can:
  - Review submissions from all students and pre-added groups.
  - Define and enforce strict requirements for laboratory work (such as required interface, mandatory tests, and linter options).
  - Generate tests corresponding to the lab assignment interface using the built-in AI assistant.

#### For Students

- After logging in, you can upload your laboratory assignment files (source `.cpp` files only – interface files are not necessary).
- Once uploaded, your submission is automatically checked. The results page will provide a summary, showing:
  - Number of test errors
  - Linter warnings
- By clicking the "More" button, you can view:
  - Detailed results for each failed test
  - The exact linter warnings
- You can also request an AI analysis, which will briefly explain what's implemented incorrectly and suggest possible fixes.

---

## Features

- **Instant feedback**: Automated testing and linting for fast error detection and style guidance.
- **AI integration**: Get improvement suggestions and automatically generate tests for submitted code.
- **Admin panel**: For teachers to manage student submissions and assessment criteria efficiently.
- **Flexible setup**: Easily adapt the system to different group structures and lab requirements.
