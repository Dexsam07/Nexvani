FROM quay.io/Dexsam07/md:beta
RUN git clone https://github.com/Dexsam07/levanter.git /root/dexsam/
WORKDIR /root/dexsam/
RUN yarn install
CMD ["npm", "start"]