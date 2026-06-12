python -m venv venv
.\venv\Scripts\activate
Install the Python dependencies:
bash
pip install -r requirements.txt
Apply database migrations:
bash


Start the FastAPI development server:
bash
uvicorn app.main:app --reload --port 8000



npm i
npm run dev