FROM quay.io/Dexsam07/md:beta
RUN git clone https://github.com/Dexsam07/Levanter.git /root/LyFE/
WORKDIR /root/LyFE/
RUN yarn install
CMD ["npm", "start"]
