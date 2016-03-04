FROM iron/node
COPY . /var/node/
WORKDIR /var/node/
EXPOSE 8080
CMD [ "node", "server.js" ]