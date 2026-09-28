/* ============================================================================
 * Chrysotop Designs — Project Brief
 * js/schema.js · Single source of truth for the questionnaire
 * ----------------------------------------------------------------------------
 * This file is PURE DATA. It contains no DOM access and no business logic, so
 * it can be imported by the browser (js/app.js) and by Node tooling
 * (tools/sync-netlify-fields.mjs) without modification.
 *
 * ── HOW TO EDIT ─────────────────────────────────────────────────────────────
 *  • Change a question's wording  ............ edit `label` / `helper`
 *  • Add or remove an option ................. edit the `options` array
 *  • Make a question optional ................ remove `required: true`
 *  • Add a follow-up question ................ add it and give it a `showIf`
 *  • Change the budget currency .............. edit META.currency (below)
 *  • Change prices ........................... edit the budget options
 *
 * After changing any field `name`, run:
 *      node tools/sync-netlify-fields.mjs
 * so the hidden Netlify form stays in sync. (tools/verify.mjs checks this.)
 * ========================================================================== */

export const META = {
  /** Netlify form name. Must match <form name="…"> in index.html. */
  formName: 'project-brief',

  /**
   * ▸ CURRENCY — change this one value to switch every budget figure.
   *   Examples: 'KES' | 'USD' | 'EUR' | 'GBP' | 'ZAR' | 'NGN'
   */
  currency: 'USD',

  /** Estimated completion time shown on the welcome screen. */
  duration: '3–5 minutes',
};

/* ── Shared option banks ─────────────────────────────────────────────────── */

const INDUSTRIES = [
  'Agriculture & Agribusiness', 'Automotive', 'Construction & Real Estate',
  'Consulting & Professional Services', 'Creative & Media', 'Education & Training',
  'Finance & Insurance', 'Food & Beverage', 'Healthcare & Wellness',
  'Hospitality & Travel', 'Legal Services', 'Logistics & Transport',
  'Manufacturing', 'Non-profit / NGO', 'Retail & E-commerce', 'Salon, Beauty & Spa',
  'Technology & Software', 'Other',
];

const GOALS = [
  { value: 'generate_leads',      label: 'Generate leads',            icon: 'target' },
  { value: 'more_enquiries',      label: 'Get more enquiries',        icon: 'mail' },
  { value: 'sell_products',       label: 'Sell products',             icon: 'bag' },
  { value: 'sell_services',       label: 'Sell services',             icon: 'spark' },
  { value: 'showcase_portfolio',  label: 'Showcase a portfolio',      icon: 'grid' },
  { value: 'establish_credibility', label: 'Establish credibility',   icon: 'shield' },
  { value: 'book_appointments',   label: 'Book appointments',         icon: 'calendar' },
  { value: 'generate_calls',      label: 'Generate phone calls',      icon: 'phone' },
  { value: 'online_store',        label: 'Create an online store',    icon: 'store' },
  { value: 'online_presence',     label: 'Build an online presence',  icon: 'globe' },
  { value: 'provide_information', label: 'Provide information',       icon: 'info' },
  { value: 'other',               label: 'Something else',            icon: 'plus' },
];

const WEBSITE_TYPES = [
  { value: 'business',            label: 'Business website',        desc: 'A focused site that wins you work',        icon: 'briefcase' },
  { value: 'corporate',           label: 'Corporate website',       desc: 'Multi-department, larger organisation',    icon: 'building' },
  { value: 'ecommerce',           label: 'E-commerce store',        desc: 'Sell products online with checkout',       icon: 'bag' },
  { value: 'portfolio',           label: 'Portfolio',               desc: 'Let the work speak for itself',            icon: 'grid' },
  { value: 'professional_services', label: 'Professional services', desc: 'Consultants, clinics, practices, firms',   icon: 'shield' },
  { value: 'landing_page',        label: 'Landing page',            desc: 'One page, one clear action',               icon: 'target' },
  { value: 'booking',             label: 'Booking & appointments',  desc: 'Let clients reserve time with you',        icon: 'calendar' },
  { value: 'restaurant',          label: 'Restaurant & hospitality', desc: 'Menus, reservations, location',           icon: 'cup' },
  { value: 'real_estate',         label: 'Real estate',             desc: 'Listings, viewings, enquiries',            icon: 'home' },
  { value: 'membership',          label: 'Membership website',      desc: 'Gated content and member accounts',        icon: 'users' },
  { value: 'blog',                label: 'Blog or content site',    desc: 'Publishing and audience building',         icon: 'pen' },
  { value: 'personal_brand',      label: 'Personal brand',          desc: 'You, your expertise, your story',          icon: 'user' },
  { value: 'other',               label: 'Something else',          desc: 'Tell us in your own words',                icon: 'plus' },
];

const DESIGN_STYLES = [
  { value: 'minimal',      label: 'Minimal' },
  { value: 'modern',       label: 'Modern' },
  { value: 'luxury',       label: 'Luxury' },
  { value: 'corporate',    label: 'Corporate' },
  { value: 'bold',         label: 'Bold' },
  { value: 'creative',     label: 'Creative' },
  { value: 'elegant',      label: 'Elegant' },
  { value: 'editorial',    label: 'Editorial' },
  { value: 'futuristic',   label: 'Futuristic' },
  { value: 'dark',         label: 'Dark' },
  { value: 'light',        label: 'Light & airy' },
  { value: 'clean',        label: 'Clean' },
  { value: 'professional', label: 'Professional' },
  { value: 'artistic',     label: 'Artistic' },
];

const FEATURES = [
  { value: 'contact_form',     label: 'Contact form',            icon: 'mail' },
  { value: 'whatsapp',         label: 'WhatsApp integration',    icon: 'whatsapp' },
  { value: 'booking',          label: 'Online booking',          icon: 'calendar' },
  { value: 'appointments',     label: 'Appointment scheduling',  icon: 'clock' },
  { value: 'ecommerce',        label: 'E-commerce',              icon: 'bag' },
  { value: 'shopping_cart',    label: 'Shopping cart',           icon: 'cart' },
  { value: 'online_payments',  label: 'Online payments',         icon: 'card' },
  { value: 'product_catalogue',label: 'Product catalogue',       icon: 'grid' },
  { value: 'blog',             label: 'Blog',                    icon: 'pen' },
  { value: 'newsletter',       label: 'Newsletter signup',       icon: 'send' },
  { value: 'customer_login',   label: 'Customer login',          icon: 'key' },
  { value: 'membership',       label: 'Membership system',       icon: 'users' },
  { value: 'testimonials',     label: 'Testimonials',            icon: 'quote' },
  { value: 'gallery',          label: 'Portfolio or gallery',    icon: 'image' },
  { value: 'maps',             label: 'Google Maps',             icon: 'pin' },
  { value: 'social',           label: 'Social media integration',icon: 'share' },
  { value: 'search',           label: 'Site search',             icon: 'search' },
  { value: 'chat',             label: 'Live chat',               icon: 'chat' },
  { value: 'reviews',          label: 'Reviews',                 icon: 'star' },
  { value: 'analytics',        label: 'Analytics',               icon: 'chart' },
  { value: 'seo',              label: 'SEO foundations',         icon: 'search' },
  { value: 'animations',       label: 'Custom animations',       icon: 'spark' },
  { value: 'other',            label: 'Something else',          icon: 'plus' },
];

const ASSETS = [
  { name: 'logo_status',               label: 'Logo' },
  { name: 'brand_guidelines_status',   label: 'Brand guidelines' },
  { name: 'images_status',             label: 'Photographs & imagery' },
  { name: 'product_photography_status',label: 'Product photography' },
  { name: 'copy_status',               label: 'Written copy & text' },
  { name: 'videos_status',             label: 'Video' },
  { name: 'testimonials_status',       label: 'Client testimonials' },
];

const ASSET_OPTIONS = [
  { value: 'ready',     label: 'Ready to go' },
  { value: 'need_help', label: 'Need your help' },
  { value: 'not_needed',label: 'Not needed' },
];

const BUDGETS = [
  {
    value: 'not_sure',
    label: 'Not sure yet',
    desc: "That's completely fine — tell us your goals and we'll advise on the right level.",
    amount: 'We will guide you',
  },
  {
    value: 'starter',
    label: 'Starter',
    desc: 'A focused, well-built single-page or small site that does one job properly.',
    amount: 'Up to {C}500',
  },
  {
    value: 'professional',
    label: 'Professional',
    desc: 'A custom multi-page website designed around your business and its goals.',
    amount: '{C}500 – 1200',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    desc: 'Custom design plus the features that do real work — booking, commerce, integrations.',
    amount: '{C}1200 – 3000',
  },
  {
    value: 'custom',
    label: 'Complex project',
    desc: 'Large scope: memberships, stores with many products, multi-location or bespoke systems.',
    amount: '{C}3000+',
  },
];

const TIMELINES = [
  { value: 'asap',        label: 'As soon as possible',   desc: 'You need it live now' },
  { value: 'two_weeks',   label: 'Within 2 weeks',        desc: 'A tight sprint' },
  { value: 'one_month',   label: 'Within 1 month',        desc: 'Comfortable and focused' },
  { value: 'one_two_months', label: 'In 1–2 months',      desc: 'Room to plan properly' },
  { value: 'two_three_months', label: 'In 2–3 months',    desc: 'Planning ahead' },
  { value: 'flexible',    label: "I'm flexible",          desc: 'Quality over speed' },
  { value: 'specific_date', label: 'I have a specific deadline', desc: 'Tell us the date' },
];

/* ── The questionnaire ───────────────────────────────────────────────────── */

/**
 * @typedef {Object} Field
 * @property {string}  name        Machine name → becomes the Netlify field name
 * @property {string}  label       Visible question
 * @property {string}  type        text|email|tel|url|textarea|select|radio|checkbox|date|color|assetmatrix
 * @property {boolean} [required]
 * @property {string}  [helper]    Small supporting text under the label
 * @property {string}  [placeholder]
 * @property {string}  [autocomplete]
 * @property {number}  [maxlength]
 * @property {number}  [minlength]
 * @property {number}  [rows]
 * @property {boolean} [optional]  Renders a visible "Optional" tag
 * @property {boolean} [wide]      Force full width in a 2-col grid
 * @property {Array}   [options]
 * @property {Object}  [showIf]    Conditional reveal rule
 * @property {Object}  [showUnless] Conditional reveal rule (inverse)
 */

export const STEPS = [
  /* ── 01 ─────────────────────────────────────────────────────────────── */
  {
    id: 'business',
    num: '01',
    label: 'Business',
    title: 'First, a little about your business.',
    lede: 'This helps us understand the context your website has to work in — before we talk about design.',
    fields: [
      {
        name: 'client_name', label: 'What is your name?', type: 'text',
        required: true, autocomplete: 'name', maxlength: 80,
        placeholder: 'e.g. Phil Jones',
      },
      {
        name: 'business_name', label: 'What is your business or company called?', type: 'text',
        required: true, autocomplete: 'organization', maxlength: 120,
        placeholder: 'e.g. Chrysotop Ventures',
        helper: 'Working on your own behalf? Just use your own name.',
      },
      {
        name: 'business_industry', label: 'Which industry are you in?', type: 'select',
        required: true, placeholder: 'Choose your industry',
        options: INDUSTRIES.map((v) => ({ value: v, label: v })),
      },
      {
        name: 'business_industry_other', label: 'Which industry, in your words?', type: 'text',
        required: true, maxlength: 80, placeholder: 'e.g. Drone surveying',
        showIf: { field: 'business_industry', in: ['Other'] },
      },
      {
        name: 'business_summary', label: 'Tell us briefly about your business.', type: 'textarea',
        required: true, rows: 4, maxlength: 600, minlength: 20, wide: true,
        placeholder: 'What you do, who you do it for, and what makes you different.',
        helper: 'A sentence or two is plenty.',
        counter: true,
      },
      {
        name: 'existing_website', label: 'Do you already have a website?', type: 'radio',
        required: true, wide: true, cols: 2,
        options: [
          { value: 'yes',               label: 'Yes',                              icon: 'check' },
          { value: 'no',                label: 'No',                               icon: 'plus' },
          { value: 'needs_redesign',    label: 'Yes, but it needs a full redesign', icon: 'refresh' },
          { value: 'needs_improvement', label: 'Yes, but it needs improvement',     icon: 'spark' },
        ],
      },
      {
        name: 'current_website_url', label: 'What is the web address?', type: 'url',
        required: true, wide: true, autocomplete: 'url', placeholder: 'yourbusiness.com',
        helper: "We'll take a look before we speak.",
        showIf: { field: 'existing_website', in: ['yes', 'needs_redesign', 'needs_improvement'] },
      },
    ],
  },

  /* ── 02 ─────────────────────────────────────────────────────────────── */
  {
    id: 'goals',
    num: '02',
    label: 'Goals',
    title: 'What should this website actually achieve?',
    lede: 'A website is a business tool. Tell us what it needs to do for you — pick as many as apply.',
    fields: [
      {
        name: 'website_goals[]', label: 'What is the main purpose of your new website?', type: 'checkbox',
        required: true, wide: true, cols: 3, min: 1,
        helper: 'Select everything that applies. You can change your answers at any point.',
        options: GOALS,
      },
      {
        name: 'website_goals_other', label: 'What else should it achieve?', type: 'text',
        required: true, wide: true, maxlength: 120, placeholder: 'Tell us in your own words',
        showIf: { field: 'website_goals[]', includesAny: ['other'] },
      },
      {
        name: 'success_definition', label: 'What would make this website a success for you?', type: 'textarea',
        required: true, rows: 4, maxlength: 600, minlength: 10, wide: true,
        placeholder: 'e.g. "Twenty qualified enquiries a month, and a site I am proud to share."',
        helper: 'Be as specific or as loose as you like — this is the target we design towards.',
        counter: true,
      },
    ],
  },

  /* ── 03 ─────────────────────────────────────────────────────────────── */
  {
    id: 'type',
    num: '03',
    label: 'Website type',
    title: 'What kind of website do you need?',
    lede: 'Choose the closest match. If it spans two, pick the dominant one and we will cover the rest together.',
    fields: [
      {
        name: 'website_type', label: 'Type of website', type: 'radio',
        required: true, wide: true, cols: 3, hideLabel: true,
        options: WEBSITE_TYPES,
      },
      {
        name: 'website_type_other', label: 'Describe the website you have in mind.', type: 'text',
        required: true, wide: true, maxlength: 150, placeholder: 'Tell us in your own words',
        showIf: { field: 'website_type', in: ['other'] },
      },
      {
        name: 'expected_pages', label: 'Roughly how many pages do you expect?', type: 'radio',
        required: true, wide: true, cols: 3,
        helper: "An estimate is fine — most projects change shape as we go.",
        options: [
          { value: '1', label: '1 page' },
          { value: '2_5', label: '2–5 pages' },
          { value: '6_10', label: '6–10 pages' },
          { value: '11_20', label: '11–20 pages' },
          { value: '20_plus', label: 'More than 20' },
          { value: 'not_sure', label: 'Not sure yet' },
        ],
      },
    ],
  },

  /* ── 04 ─────────────────────────────────────────────────────────────── */
  {
    id: 'design',
    num: '04',
    label: 'Design',
    title: 'How should it look and feel?',
    lede: 'You are not expected to be a designer. Telling us what you are drawn to — and what you dislike — is more than enough.',
    fields: [
      {
        name: 'design_style[]', label: 'How would you describe the visual style you want?', type: 'checkbox',
        required: true, wide: true, cols: 4, min: 1,
        helper: 'Choose as many as apply — three or four words is usually enough. Words you would use to describe your business work well here.',
        options: DESIGN_STYLES,
      },
      {
        name: 'design_references', label: 'Are there websites whose design you like?', type: 'textarea',
        required: false, optional: true, rows: 3, wide: true, maxlength: 500,
        placeholder: 'yourcompetitor.com\nasiteyoulove.com',
        helper: 'One address per line. A short note on what you like about each is even more useful.',
      },
      {
        name: 'brand_colors', label: 'What colours would you like your website to use?', type: 'text',
        required: false, optional: true, maxlength: 160, wide: true,
        placeholder: 'e.g. Deep green, warm cream, and a little gold',
        helper: 'Names, brands, or hex codes such as #1A5632 — anything you have.',
        hideIf: { field: 'open_to_recommendations', checked: true },
      },
      {
        name: 'brand_color_primary', label: 'Primary colour', type: 'color',
        required: false, optional: true,
        hideIf: { field: 'open_to_recommendations', checked: true },
        helper: 'Optional — use the picker if you have an exact colour.',
      },
      {
        name: 'brand_color_secondary', label: 'Secondary colour', type: 'color',
        required: false, optional: true,
        hideIf: { field: 'open_to_recommendations', checked: true },
        helper: 'Optional.',
      },
      {
        name: 'open_to_recommendations', label: "I'm open to your recommendations", type: 'toggle',
        wide: true,
        helper: 'Recommended if you are unsure. We will propose a palette built around your brand and your market.',
      },
      {
        name: 'design_avoid', label: 'Are there websites you do not like?', type: 'textarea',
        required: false, optional: true, rows: 3, wide: true, maxlength: 500,
        placeholder: 'Addresses, or simply things you want us to avoid — cluttered layouts, busy animation, dark backgrounds…',
        helper: 'Knowing what to avoid is just as valuable as knowing what you like.',
      },
    ],
  },

  /* ── 05 ─────────────────────────────────────────────────────────────── */
  {
    id: 'features',
    num: '05',
    label: 'Features',
    title: 'What should the website be able to do?',
    lede: 'Select everything you might need. If you are unsure about any of these, leave it — we will advise.',
    fields: [
      {
        name: 'required_features[]', label: 'Which features will your website need?', type: 'checkbox',
        required: true, wide: true, cols: 3, min: 1,
        options: FEATURES,
      },
      {
        name: 'features_other', label: 'What else should it do?', type: 'text',
        required: true, wide: true, maxlength: 150, placeholder: 'Tell us in your own words',
        showIf: { field: 'required_features[]', includesAny: ['other'] },
      },

      /* — Selling online — */
      {
        name: 'product_count', label: 'Approximately how many products will you sell?', type: 'radio',
        required: true, wide: true, cols: 3, group: 'Selling online',
        showIf: { field: 'required_features[]', includesAny: ['ecommerce', 'shopping_cart', 'online_payments', 'product_catalogue'] },
      options: [
          { value: '1_10', label: '1–10 products' },
          { value: '11_50', label: '11–50 products' },
          { value: '51_200', label: '51–200 products' },
          { value: '201_1000', label: '201–1,000 products' },
          { value: '1000_plus', label: 'More than 1,000' },
          { value: 'not_sure', label: 'Not sure yet' },
        ],
      },
      {
        name: 'product_setup', label: 'How would you like products to be added?', type: 'radio',
        required: true, wide: true, cols: 3,
        showIf: { field: 'required_features[]', includesAny: ['ecommerce', 'shopping_cart', 'online_payments', 'product_catalogue'] },
        options: [
          { value: 'we_upload',  label: 'We will upload them',      desc: 'You provide the details and images' },
          { value: 'help_us',    label: 'We need help adding them', desc: 'We assist with the catalogue' },
          { value: 'integration',label: 'Connect an existing system', desc: 'POS, ERP, or an existing store' },
          { value: 'not_sure',   label: 'Not sure yet' },
        ],
      },

      /* — Appointments — */
      {
        name: 'booking_type', label: 'What should visitors be able to book?', type: 'text',
        required: true, wide: true, maxlength: 200, group: 'Appointments',
        placeholder: 'e.g. A 30-minute consultation, or a site visit',
        showIf: { field: 'required_features[]', includesAny: ['booking', 'appointments'] },
      },
      {
        name: 'booking_scale', label: 'Who will they be booking with?', type: 'radio',
        required: true, wide: true, cols: 2,
        showIf: { field: 'required_features[]', includesAny: ['booking', 'appointments'] },
        options: [
          { value: 'one_person',   label: 'One person' },
          { value: 'several',      label: 'A few staff members' },
          { value: 'multiple_locations', label: 'Several locations' },
          { value: 'not_sure',     label: 'Not sure yet' },
        ],
      },

      /* — Accounts & membership — */
      {
        name: 'member_count', label: 'How many members or account holders do you expect?', type: 'radio',
        required: true, wide: true, cols: 3, group: 'Accounts',
        showIf: { field: 'required_features[]', includesAny: ['customer_login', 'membership'] },
        options: [
          { value: '1_100', label: 'Up to 100' },
          { value: '101_1000', label: '100–1,000' },
          { value: '1000_plus', label: 'More than 1,000' },
          { value: 'not_sure', label: 'Not sure yet' },
        ],
      },

      /* — Publishing — */
      {
        name: 'content_frequency', label: 'How often will you publish new posts?', type: 'radio',
        required: true, wide: true, cols: 4, group: 'Publishing',
        showIf: { field: 'required_features[]', includesAny: ['blog'] },
        options: [
          { value: 'weekly',     label: 'Weekly' },
          { value: 'monthly',    label: 'Monthly' },
          { value: 'occasionally', label: 'Occasionally' },
          { value: 'not_sure',   label: 'Not sure yet' },
        ],
      },
    ],
  },

  /* ── 06 ─────────────────────────────────────────────────────────────── */
  {
    id: 'content',
    num: '06',
    label: 'Content',
    title: 'What content do you already have?',
    lede: 'Content is usually the longest part of any project. Knowing where you stand now lets us plan realistically.',
    fields: [
      {
        name: 'content_status', label: 'Do you already have the content for the website?', type: 'radio',
        required: true, wide: true, cols: 2,
        options: [
          { value: 'ready',        label: 'Yes, everything is ready',  icon: 'check' },
          { value: 'partial',      label: 'I have some content',       icon: 'half' },
          { value: 'need_help',    label: 'No — I need help creating it', icon: 'spark' },
          { value: 'unsure',       label: "I'm not sure yet",          icon: 'help' },
        ],
      },
      {
        name: '__assets', label: 'Tell us about each element.', type: 'assetmatrix',
        required: true, wide: true,
        helper: 'One answer per row. It takes a few seconds.',
        rows_assets: ASSETS,
        options: ASSET_OPTIONS,
      },
      {
        name: 'content_notes', label: 'Anything else about your content?', type: 'textarea',
        required: false, optional: true, rows: 3, wide: true, maxlength: 500,
        placeholder: 'e.g. "Our photos are on an old hard drive" or "We can write the words if you guide us."',
      },
    ],
  },

  /* ── 07 ─────────────────────────────────────────────────────────────── */
  {
    id: 'technical',
    num: '07',
    label: 'Technical',
    title: 'Domain, hosting, and the bits behind the scenes.',
    lede: 'No technical knowledge required. If you are unsure about any of this, that is completely normal — it is our job, not yours.',
    fields: [
      {
        name: 'domain_status', label: 'Do you already own a domain name?', type: 'radio',
        required: true, wide: true, cols: 3,
        helper: 'A domain is your web address, e.g. yourbusiness.com',
        options: [
          { value: 'yes',      label: 'Yes' },
          { value: 'no',       label: 'No' },
          { value: 'not_sure', label: "I'm not sure" },
        ],
      },
      {
        name: 'domain_name', label: 'What is your domain?', type: 'text',
        required: true, wide: true, maxlength: 120, placeholder: 'yourbusiness.com',
        showIf: { field: 'domain_status', in: ['yes'] },
      },
      {
        name: 'hosting_status', label: 'Do you already have hosting?', type: 'radio',
        required: true, wide: true, cols: 3,
        helper: 'Hosting is where the website lives. If you are not sure, we can check for you.',
        options: [
          { value: 'yes',      label: 'Yes' },
          { value: 'no',       label: 'No' },
          { value: 'not_sure', label: "I'm not sure" },
        ],
      },
      {
        name: 'integrations', label: 'Do you use any tools the website should connect to?', type: 'text',
        required: false, optional: true, wide: true, maxlength: 240,
        placeholder: 'e.g. QuickBooks, a booking system, Instagram shop, an existing database',
        helper: 'Optional — but useful if you already run your business on specific software.',
      },
    ],
  },

  /* ── 08 ─────────────────────────────────────────────────────────────── */
  {
    id: 'budget',
    num: '08',
    label: 'Budget',
    title: 'What have you set aside for this?',
    lede: 'Hearing your range first means we can design something that genuinely fits, rather than pitching something you cannot use.',
    note: "There is no wrong answer here. A clear range saves us all time, and we will always tell you honestly what is achievable within it.",
    fields: [
      {
        name: 'budget_range', label: 'What investment range have you allocated for your website project?', type: 'radio',
        required: true, wide: true, cols: 1, budget: true,
        options: BUDGETS,
      },
      {
        name: 'budget_notes', label: 'Anything else about your budget or expectations?', type: 'textarea',
        required: false, optional: true, rows: 3, wide: true, maxlength: 500,
        placeholder: 'e.g. "We would rather start small and grow", or "We need to include monthly maintenance."',
      },
    ],
  },

  /* ── 09 ─────────────────────────────────────────────────────────────── */
  {
    id: 'timeline',
    num: '09',
    label: 'Timeline',
    title: 'When would you like it live?',
    lede: 'This tells us how to sequence the work — and whether we need to talk this week.',
    fields: [
      {
        name: 'timeline', label: 'When would you ideally like your website to launch?', type: 'radio',
        required: true, wide: true, cols: 2,
        options: TIMELINES,
      },
      {
        name: 'target_launch_date', label: 'What is the deadline?', type: 'date',
        required: true, wide: true,
        helper: 'If the date is tied to an event or campaign, tell us more below.',
        showIf: { field: 'timeline', in: ['specific_date'] },
      },
      {
        name: 'timeline_reason', label: 'Is there anything driving the timeline?', type: 'text',
        required: false, optional: true, wide: true, maxlength: 200,
        placeholder: 'e.g. A trade fair in March, or a funding round',
        showIf: { field: 'timeline', in: ['specific_date', 'asap', 'two_weeks', 'one_month'] },
      },
    ],
  },

  /* ── 10 ─────────────────────────────────────────────────────────────── */
  {
    id: 'contact',
    num: '10',
    label: 'Contact',
    title: 'Where should we send our response?',
    lede: 'Last step. We will review your brief and come back to you personally — usually within one working day.',
    fields: [
      {
        name: 'client_name', label: 'Full name', type: 'text',
        required: true, autocomplete: 'name', maxlength: 80, prefillFrom: 'client_name',
      },
      {
        name: 'business_name', label: 'Business or company', type: 'text',
        required: true, autocomplete: 'organization', maxlength: 120, prefillFrom: 'business_name',
        helper: 'Carried over from your first answers — edit if anything has changed.',
      },
      {
        name: 'email', label: 'Email address', type: 'email',
        required: true, autocomplete: 'email', maxlength: 160,
        placeholder: 'you@yourbusiness.com',
        helper: 'We reply to this address, so please double-check it.',
      },
      {
        name: 'phone', label: 'Phone number', type: 'tel',
        required: false, optional: true, autocomplete: 'tel', maxlength: 40, inputmode: 'tel',
        placeholder: '+254 700 000 000',
      },
      {
        name: 'whatsapp', label: 'WhatsApp number', type: 'tel',
        required: false, optional: true, autocomplete: 'tel-national', maxlength: 40, inputmode: 'tel',
        placeholder: '+254 700 000 000',
        helper: 'Only if it differs from your phone number.',
        hideIf: { field: 'whatsapp_same_as_phone', checked: true },
      },
      {
        name: 'whatsapp_same_as_phone', label: 'My WhatsApp number is the same as my phone number', type: 'toggle',
        wide: true,
      },
      {
        name: 'preferred_contact', label: 'How would you prefer we contact you?', type: 'radio',
        required: true, wide: true, cols: 3,
        options: [
          { value: 'email',    label: 'Email',    icon: 'mail' },
          { value: 'phone',    label: 'Phone call', icon: 'phone' },
          { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
        ],
      },
      {
        name: 'referral_source', label: 'How did you hear about Chrysotop Designs?', type: 'select',
        required: true, wide: true, placeholder: 'Choose one',
        options: ['Google', 'Facebook', 'Instagram', 'LinkedIn', 'Referral', 'WhatsApp', 'Other']
          .map((v) => ({ value: v.toLowerCase(), label: v })),
      },
      {
        name: 'referral_source_other', label: 'Where did you hear about us?', type: 'text',
        required: true, wide: true, maxlength: 120, placeholder: 'Tell us in your own words',
        showIf: { field: 'referral_source', in: ['other'] },
      },
      {
        name: 'additional_information', label: 'Is there anything else you would like us to know about your project?', type: 'textarea',
        required: false, optional: true, rows: 4, wide: true, maxlength: 800,
        placeholder: 'Anything at all — constraints, ideas, past experience, questions for us.',
      },
      {
        name: 'contact_consent', label: 'I am happy for Chrysotop Designs to contact me about this enquiry.', type: 'toggle',
        required: true, wide: true,
      },
    ],
  },
];

/* ── Derived helpers used by both the app and the tooling ────────────────── */

/** Flatten every real field (excluding presentation-only synthetic fields). */
export function allFields() {
  const out = [];
  for (const step of STEPS) {
    for (const f of step.fields) {
      if (f.type === 'assetmatrix') {
        for (const a of f.rows_assets) {
          out.push({ name: a.name, label: `${a.label} status`, type: 'radio', options: f.options, step: step.id });
        }
        continue;
      }
      out.push({ ...f, step: step.id });
    }
  }
  return out;
}

/** Every distinct Netlify field name, in submission order. */
export function allFieldNames() {
  const seen = new Set();
  const names = [];
  for (const f of allFields()) {
    if (!seen.has(f.name)) { seen.add(f.name); names.push(f.name); }
  }
  return names;
}

/** Steps that carry fields (used by the review screen). */
export const REVIEW_GROUPS = [
  { id: 'business',  label: 'Business' },
  { id: 'goals',     label: 'Website goals' },
  { id: 'type',      label: 'Website type' },
  { id: 'design',    label: 'Design direction' },
  { id: 'features',  label: 'Features' },
  { id: 'content',   label: 'Content' },
  { id: 'technical', label: 'Technical requirements' },
  { id: 'budget',    label: 'Budget' },
  { id: 'timeline',  label: 'Timeline' },
  { id: 'contact',   label: 'Contact details' },
];
