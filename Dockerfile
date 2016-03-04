FROM iron/node
COPY . /var/node/
WORKDIR /var/node/
EXPOSE 3000
CMD [ "node", "server.js" ]