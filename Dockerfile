FROM node:8.11.1-alpine

WORKDIR /app
ADD . /tmp
RUN /bin/sh -c 'cd /tmp/release && tar xvzf pandoc-2.7.3-linux.tar.gz --strip-components 1 -C /usr/local && chmod +x /usr/local/bin/pandoc'
RUN /bin/sh -c 'cd /tmp && npm install && npm install -g typescript && npm run build && mv ./dist/* /app/ && mv ./node_modules /app/ && rm -rf /tmp'
EXPOSE 2280

ENV MYSQL_USERNAME rap2_admin
ENV MYSQL_PASSWD Fu9ZmU6x#2KB
ENV MYSQL_SCHEMA db_rap2_delos_app

ENV REDIS_DB 15

ENTRYPOINT ["node","dispatch.js"]
