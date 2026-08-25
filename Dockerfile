FROM quay.io/lyfe00011/md:beta
RUN git clone https://github.com/Dexsam07/Nexvani.git /root/Nexvani/
WORKDIR /root/Nexvani/
RUN yarn install
CMD ["npm", "start"]