FROM node:6.6

WORKDIR /app

ADD package.json /app/package.json
RUN npm install

ADD ./.eslintrc /app/.eslintrc
ADD ./lib /app/lib
ADD ./test /app/test

RUN npm test

CMD npm run test:integration
