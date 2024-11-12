# VyFood Backend

> VyFood NodeJS backend repository.

## Prerequisites

- npm >= v10.5.2
- node >= v20.13.1
- MySQL >= v8.4.0
- nginx >= 1.26.2

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
│   │   ├── banh-cuon.jpg
│   │   ├── banh-uot.jpg
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

1. Proxy that expose API server. (For production)
2. Proxy that serves uploaded files from upload folder.

#### 3A. Development configuration

1. API Server: We just send requests directly to `localhost:1284` so no proxy is needed.

2. Upload: `localhost:1234` --> `/upload`

`mylocal.conf`

```plain
server {
    listen 1234;
    server_name localhost;
    client_max_body_size 100M;
    root path/to/backend/project/upload;
}
```

Output:

- API Server: `localhost:1284`
- Upload: `localhost:1234`

Limitation: The website will only work correctly if accessed on the same host. Use IPv4 instead of localhost will not work because we can't set secured cookies via a non-https connection (localhost is an exception)

Limitation workaround: Use a real domain with SSL for api server proxy.

#### 3B. Production configuration

1. API Server: `api.mydomain.com` --> `localhost:1284`
2. Upload: `upload.mydomain.com` --> `/upload`

`mydomain.com.conf`

```plain
server {
    listen 80;
    server_name api.mydomain.com;
    client_max_body_size 100M;
    return 301 https://api.mydomain.com$request_uri;
}

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

server {
    listen 80;
    server_name upload.mydomain.com;
    client_max_body_size 100M;
    return 301 https://upload.mydomain.com$request_uri;
}

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

- API Server: `https://api.mydomain.com`
- Upload: `https://upload.mydomain.com`

### 4. Set environment variables

```bash
NODE_ENV=development
CORS_ORIGIN=https://mydomain.com http://localhost:8080
NODEMAILER_USER=yourgmail@gmail.com
NODEMAILER_APP_PASSWORD=your-google-app-password
NODEMAILER_DOMAIN=https://mydomain.com
DATABASE_HOST=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
PORT=1284
```

## Usage

```bash
# Start server in development mode
npm run start-nodemon

# Or start server in production mode
npm start
```

Check `package.json`, `.vscode` folder for scripts and tasks.
