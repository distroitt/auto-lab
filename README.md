To run the project you need:
- Installed Docker
- Python 3+
- Pip package manager
- Python virtual environment

You need to do the following to set up and run the project:
- Create a venv command `python3 -m venv .venv` in the current project directory
- Install its active using the command `source .venv/bin/activate`
- Install the necessary depending on `pip install -r require.txt`
- Specify the environment variable depending on what the site is running on, if locally then:
`export MAIN_ENDPOINT=http://127.0.0.1:8000`, otherwise, for example `export MAIN_ENDPOINT=http://{IP on local network}:8000`
- Run one command `uvicorn app.main:app --reload`

P.S. With this launch, the site will be launched locally and accessible at the address you specified in the environment variable.

You can log in to the site using your data from BSUIR IIS. If you are a teacher, you can
politely happened to the one who will run this site, write you down in the list of administrators by your student number.
You can add to the list of admins in `app/core/config.py`, the list will be called ADMINS.

If you are a regular student, after logging in, you have the opportunity to send your laboratory liquid.
The verification work is carried out as follows: you need to upload the cpp file(s) in which the implementation was written.
all technical interfaces that are equipped with hardware and teacher. You do not need to upload interface files.
After loading the laboratory, the pandemic waited a little while checking, and after you saw the criminal's window, which
Briefly displays how many errors you have in the tests and how many linter warnings.
You can click the "More" button and see the details: which tests failed, what contamination they have, the detailed text of linting warnings. You can also request an analysis from the AI, which briefly writes what you have implemented incorrectly and incorrectly.
how to fix it.

If you are a teacher, you have access to the admin panel, where you can evaluate all the links of each student from the
pre-added groups, as well as strict requirements for lab work. Namely, the interface that needs to
be implemented, critical tests and a list of options for the linter. Also (if you are very lazy about writing tests) you have a
great opportunity to use the help of the AI and ask it a request. It will generate tests for every taste, corresponding
to the interface of the lab work.
