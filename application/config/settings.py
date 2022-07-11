from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    as_sqlite: bool = True
    database: str

    DB_HOST: str = Field("localhost", env="DB_HOST")
    DB_PORT: int = Field(5432, env="DB_PORT")
    DB_USER: str = Field("postgres", env="DB_USER")
    DB_PASSWORD: str = Field("docker", env="DB_PASSWORD")

    MODELS = [
        "application.database.models.user",
    ]

    class Config:
        case_sensitive: bool = True
