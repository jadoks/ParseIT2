FROM node:20-bookworm-slim

# Python (for scripts/convert_to_pdf.py) + LibreOffice Writer (does the actual
# DOCX -> PDF conversion) + fonts so the PDF layout matches the Word template.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      libreoffice-writer \
      fonts-liberation fonts-dejavu-core fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Includes server.js, templates/sas-template.docx and scripts/convert_to_pdf.py
COPY . .

ENV NODE_ENV=production
CMD ["node", "server.js"]
