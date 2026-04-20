const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zextons';

async function clearFooterLocalhostUrls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import the model
    const FooterSettings = require('../src/models/footerSettings');

    // Find the footer settings
    const footerSettings = await FooterSettings.findOne();

    if (!footerSettings) {
      console.log('No footer settings found in database');
      return;
    }

    console.log('Current footer settings:');
    console.log('- Logo image:', footerSettings.section1?.logo?.image);
    console.log('- Ecologi logo:', footerSettings.section5?.ecologiLogo);

    let updated = false;

    // Clear localhost URLs from logo
    if (footerSettings.section1?.logo?.image && footerSettings.section1.logo.image.includes('localhost')) {
      console.log('Clearing localhost logo URL...');
      footerSettings.section1.logo.image = null;
      updated = true;
    }

    // Clear localhost URLs from ecologi logo
    if (footerSettings.section5?.ecologiLogo && footerSettings.section5.ecologiLogo.includes('localhost')) {
      console.log('Clearing localhost ecologi logo URL...');
      footerSettings.section5.ecologiLogo = null;
      updated = true;
    }

    if (updated) {
      await footerSettings.save();
      console.log('Footer settings updated successfully!');
      console.log('New values:');
      console.log('- Logo image:', footerSettings.section1?.logo?.image);
      console.log('- Ecologi logo:', footerSettings.section5?.ecologiLogo);
    } else {
      console.log('No localhost URLs found in footer settings');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearFooterLocalhostUrls();
