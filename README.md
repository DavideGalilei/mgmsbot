# mgmsbot

## Deploy
- Clone the repo on your server using Github Deploy Keys.
- Add the games in @BotFather
- Edit `.env`

```shell
cd mgmsbot
git pull
docker build -t mgmgsbot .
docker run -itd -p 127.0.0.1:8081:8081 --restart=unless-stopped --name=mgms --env-file=.env -v data:data mgmsbot
```

- Setup certbot and nginx
- Use `nginx.conf` (change your domain)
