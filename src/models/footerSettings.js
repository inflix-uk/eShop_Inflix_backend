const mongoose = require('mongoose');

const footerSettingsSchema = new mongoose.Schema({
  section1: {
    logo: {
      image: {
        type: String,
        default: null
      },
      altText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [200, "Logo alt text cannot exceed 200 characters"]
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
    },
    // The built-in "Cookie settings" button under the bottom bar. Hiding it
    // leaves the consent banner and any custom cookie-settings link working.
    showCookieSettingsButton: {
      type: Boolean,
      default: true
    }
  },
  sectionCustom: [{
    isEnabled: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Custom section title cannot exceed 200 characters']
    },
    placement: {
      type: String,
      enum: [
        'after_logo',
        'after_useful_links',
        'after_customer_care',
        'after_newsletter',
        'after_contact'
      ],
      default: 'after_useful_links'
    },
    order: {
      type: Number,
      default: 0
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
  }],
  sectionPayments: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    heading: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Payment methods heading cannot exceed 200 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Payment methods description cannot exceed 1000 characters']
    },
    logos: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Payment method name cannot exceed 100 characters']
      },
      image: {
        type: String,
        default: ''
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
  sectionContact: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Contact section title cannot exceed 200 characters']
    },
    items: [{
      type: {
        type: String,
        enum: ['phone', 'email', 'whatsapp', 'address'],
        default: 'phone'
      },
      label: {
        type: String,
        default: '',
        trim: true,
        maxlength: [200, 'Contact label cannot exceed 200 characters']
      },
      value: {
        type: String,
        required: true,
        trim: true,
        maxlength: [500, 'Contact detail cannot exceed 500 characters']
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
  customHtml: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    position: {
      type: String,
      enum: ['above_columns', 'below_columns', 'replace_columns'],
      default: 'below_columns'
    },
    html: {
      type: String,
      default: '',
      maxlength: [100000, 'Footer HTML cannot exceed 100,000 characters']
    },
    css: {
      type: String,
      default: '',
      maxlength: [100000, 'Footer CSS cannot exceed 100,000 characters']
    }
  },
  layout: {
    columnOrder: {
      type: [String],
      default: undefined
    },
    hiddenColumns: {
      type: [String],
      default: undefined
    },
    colors: {
      background: { type: String, default: '' },
      text: { type: String, default: '' },
      heading: { type: String, default: '' },
      linkHover: { type: String, default: '' },
      border: { type: String, default: '' }
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
