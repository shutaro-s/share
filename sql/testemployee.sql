CREATE TABLE shifty.testemployee (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255),
    admin_flag INT,
    password VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)DEFAULT CHARSET = utf8;
