import os
from os import PathLike
from pathlib import Path

from fastapi import HTTPException
from fastapi.openapi.models import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope


class SafeStaticFiles(StaticFiles):
    def file_response(
            self,
            full_path: PathLike,
            stat_result: os.stat_result,
            scope: Scope,
            status_code: int = 200,
    ) -> Response:
        if Path(full_path).suffix in {".jinja2"}:
            raise HTTPException(status_code=404)

        return super().file_response(full_path, stat_result, scope, status_code)
