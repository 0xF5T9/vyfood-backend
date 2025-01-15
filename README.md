# E-Mart Backend

> E-Mart NodeJS backend repository.

## Prerequisites

- npm >= v10.5.2
- node >= v20.13.1
- MySQL >= v8.4.0
- nginx >= 1.26.2
- Domain with SSL

## Install

### 1. Install dependencies

```shell
npm install
```

### 2. Create database schemas

```sql
CREATE DATABASE database_name;
```

Import `schema.sql` or `schema-structure-only.sql` into the database using the below commands or use 3rd party software.

#### 2A. Create structures with default data

```cmd
mysql -u user -p database_name < schema.sql
```

Extract `upload.zip`

Expected results:

```plain
root/
├── .vscode
├── configs
├── node_modules
├── sources
├── upload/
│   ├── product/
│   │   └── ...
│   ├── category/
│   │   └── ...
│   └── avatar/
│       └── ...
└── ...
```

##### Default admin user

User: `truyenhaunhan`

Password: `truyenhaunhan`

#### 2B. Create structures only

```cmd
mysql -u user -p database_name < schema-structure-only.sql
```

##### Use this query command to update user role to admin

```sql
UPDATE users SET `role` = 'admin' WHERE username = 'your_username'
```

### 3. Configure nginx reverse proxy

We need to set 2 proxies:

1. Proxy that expose API server.
2. Proxy that serves uploaded files from upload folder.

`mydomain.com.backend.conf`

```plain
# Redirect HTTP to HTTPS. (API Server)
server {
    listen 80;
    server_name api.mydomain.com;
    client_max_body_size 100M;
    return 301 https://api.mydomain.com$request_uri;
}

# Proxy pass to node api server
server {
    listen 443 ssl;
    server_name api.mydomain.com;
    client_max_body_size 100M;
    ssl_certificate path/to/ssl/cert.pem;
    ssl_certificate_key path/to/ssl/cert-key.pem;

    location / {
        # proxy_cache off;
        proxy_pass http://localhost:1284;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS. (Upload)
server {
    listen 80;
    server_name upload.mydomain.com;
    client_max_body_size 100M;
    return 301 https://upload.mydomain.com$request_uri;
}

# Serves static files from upload folder.
server {
    listen 443 ssl;
    server_name upload.mydomain.com;
    client_max_body_size 100M;
    root path/to/backend/project/upload;
    ssl_certificate path/to/ssl/cert.pem;
    ssl_certificate_key path/to/ssl/cert-key.pem;
}
```

Output:

- API Server URL: `https://api.mydomain.com`
- Upload URL: `https://upload.mydomain.com`

### 4. Set environment variables

- `NODE_ENV` - `development` or `production`
- `CORS_ORIGIN` - Cross origin domain(s).
- `NODEMAILER_USER` - Google user.
- `NODEMAILER_APP_PASSWORD` - Google user app password.
- `NODEMAILER_DOMAIN` - Domain that will be used when sending mails.
- `NEWSLETTER_VALIDATION_TOKEN_SECRET_KEY` - The key that will be used to sign newsletter token.
- `DATABASE_HOST` - MySQL host.
- `DATABASE_USER` - MySQL user.
- `DATABASE_PASSWORD` - MySQL password.
- `DATABASE_NAME` - MySQL database name.
- `PORT` - Node server port.

```bash
NODE_ENV=development
CORS_ORIGIN=https://mydomain.com
NODEMAILER_USER=yourgmail@gmail.com
NODEMAILER_APP_PASSWORD=your-google-app-password
NODEMAILER_DOMAIN=https://mydomain.com
NEWSLETTER_VALIDATION_TOKEN_SECRET_KEY=
DATABASE_HOST=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
PORT=1284
```

## Usage

```bash
# Start server in development mode (NODE_ENV value must be 'development')
npm run start-nodemon

# Or start server in production mode (NODE_ENV value must be 'production')
npm start
```

Check `package.json`, `.vscode` folder for scripts and tasks.
