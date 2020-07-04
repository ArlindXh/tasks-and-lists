FROM node:8.10.0-alpine

RUN npm install -g serverless

WORKDIR /main/

COPY ./package.json /main/package.json

RUN npm install

COPY . /main/

EXPOSE 3000

CMD ["npm", "run", "dev"]