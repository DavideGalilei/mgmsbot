FROM python:3.10
ENV PYTHONUNBUFFERED=1

RUN apt install git

WORKDIR /code
COPY requirements.txt /code/
RUN pip install -U wheel pip
RUN pip install -r requirements.txt
COPY . /code/

ENTRYPOINT [ "python3", "main.py" ]
