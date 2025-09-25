FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm install -g
CMD ["/bin/sh", "-c", "nightscout-profile-converter -n $(echo $NS_HOST) -p $(echo $NS_PROFILE) -c $(echo $MIN_5MIN_CARBIMPACT) --autosens-min $(echo $AUTOSENS_MIN) --autosens-max $(echo $AUTOSENS_MAX) " ]