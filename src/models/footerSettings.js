const mongoose = require('mongoose');

const footerSettingsSchema = new mongoose.Schema({
  section1: {
    logo: {
      image: {
        type: String,
        default: null
      },
      link: {
        type: String,
        default: '/'
      }
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Footer description cannot exceed 2000 characters']
    },
    socialMedia: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      icon: {
        type: String,
        default: null
      },
      link: {
        type: String,
        required: true,
        trim: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }]
  },
  section2: {
    title: {
      type: String,
      default: ''
    },
    links: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      link: {
        type: String,
        required: true,
        trim: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }]
  },
  section3: {
    title: {
      type: String,
      default: ''
    },
    links: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      link: {
        type: String,
        required: true,
        trim: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }]
  },
  section4: {
    title: {
      type: String,
      default: ''
    },
    links: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      link: {
        type: String,
        required: true,
        trim: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }]
  },
  sectionNewsletter: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    heading: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Newsletter heading cannot exceed 200 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Newsletter description cannot exceed 1000 characters']
    },
    placeholder: {
      type: String,
      default: '',
      trim: true,
      maxlength: [120, 'Placeholder cannot exceed 120 characters']
    },
    buttonLabel: {
      type: String,
      default: '',
      trim: true,
      maxlength: [80, 'Button label cannot exceed 80 characters']
    },
    imageUrl: {
      type: String,
      default: ''
    }
  },
  bottomBar: {
    textBeforeCredit: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Bottom bar text cannot exceed 2000 characters']
    },
    creditLabel: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Credit label cannot exceed 200 characters']
    },
    creditUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Credit URL cannot exceed 500 characters']
    }
  },
  section5: {
    title: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: ''
    },
    ecologiLogo: {
      type: String,
      default: null
    },
    ecologiLink: {
      type: String,
      default: ''
    },
    paymentMethods: {
      heading: {
        type: String,
        default: ''
      },
      logos: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        image: {
          type: String,
          default: null
        },
        isActive: {
          type: Boolean,
          default: true
        },
        order: {
          type: Number,
          default: 0
        }
      }]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save hook to update timestamps
footerSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FooterSettings', footerSettingsSchema);
