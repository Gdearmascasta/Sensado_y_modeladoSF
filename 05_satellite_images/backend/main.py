from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import search, bands, indices, classifier, export

app = FastAPI(title="Satellite Images API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(bands.router)
app.include_router(indices.router)
app.include_router(classifier.router)
app.include_router(export.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
