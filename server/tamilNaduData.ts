export interface TnBoothSeed {
  station_code: string;
  name: string;
  address: string;
  pin_code: string;
  district: string;
  constituency_name: string;
  constituency_code: string;
  polling_area: string;
  booth_number: string;
  location_type: 'School' | 'College' | 'Community Hall' | 'Civic Centre' | 'Public Library';
  accessibility_facilities: string;
  available_facilities: string;
  latitude: number;
  longitude: number;
  registered_demo_voters: number;
}

interface DistrictSpec {
  district: string;
  prefix: string;
  basePin: string;
  lat: number;
  lng: number;
  constituencies: Array<{
    name: string;
    code: string;
    areas: Array<{
      area: string;
      pin: string;
      booths: Array<{
        name: string;
        type: TnBoothSeed['location_type'];
        street: string;
        boothNo: string;
      }>;
    }>;
  }>;
}

const ACCESSIBILITY_VARIANTS = [
  'Wheelchair Ramp, Tactile Path, Accessible Restroom, Braille Signage',
  'Step-Free Ground Entrance, Wheelchair Available, Priority Senior Lane',
  'Wheelchair Ramp, Volunteer Escort, Hearing Loop Desk, Wide Entry Doors',
  'Elevator Access, Tactile Floor Guide, Accessible Restroom, Braille Guide',
];

const FACILITY_VARIANTS = [
  'Drinking Water, Shaded Waiting Hall, Help Desk, First Aid Kit',
  'Drinking Water, Covered Courtyard, Seating Benches, Backup Lighting',
  'Drinking Water, Air-Ventilated Hall, Medical Corner, Parking Bay',
  'Drinking Water, Waiting Pavilion, Voter Assistance Desk, Solar Backup',
];

const DISTRICT_SPECS: DistrictSpec[] = [
  {
    district: 'Chennai',
    prefix: 'CHE',
    basePin: '600001',
    lat: 13.0827,
    lng: 80.2707,
    constituencies: [
      {
        name: 'Perambur',
        code: 'TN-AC-012',
        areas: [
          {
            area: 'Perambur North (Paper Mills Road)',
            pin: '600011',
            booths: [
              { name: 'Govt. Boys Higher Secondary School, Perambur', type: 'School', street: '42 Paper Mills Road, Perambur', boothNo: 'Booth 01 – Main Block' },
              { name: 'St. Marys Matriculation Higher Secondary School', type: 'School', street: '18 Sembium High Road, Perambur', boothNo: 'Booth 02 – Ground Wing' },
            ],
          },
          {
            area: 'Vyasarpadi & Madhavaram High Road',
            pin: '600039',
            booths: [
              { name: 'Dr. Ambedkar Government Arts College, Vyasarpadi', type: 'College', street: '65 Erukkancheri High Road, Vyasarpadi', boothNo: 'Booth 03 – Science Hall' },
              { name: 'Chennai Primary Municipal School, B.V. Colony', type: 'School', street: '11 B.V. Colony Main Road, Perambur', boothNo: 'Booth 04 – East Classroom' },
            ],
          },
          {
            area: 'Perambur Railway Colony',
            pin: '600023',
            booths: [
              { name: 'Southern Railway Mixed Higher Secondary School', type: 'School', street: '9 Loco Works Road, Perambur', boothNo: 'Booth 05 – Assembly Hall' },
            ],
          },
        ],
      },
      {
        name: 'Sholinganallur',
        code: 'TN-AC-027',
        areas: [
          {
            area: 'Sholinganallur IT Corridor (OMR)',
            pin: '600119',
            booths: [
              { name: 'Govt. Higher Secondary School, Sholinganallur', type: 'School', street: '104 Rajiv Gandhi Salai (OMR), Sholinganallur', boothNo: 'Booth 01 – Block A' },
              { name: 'Sathyabama Civic Engineering Auditorium', type: 'College', street: '210 OMR Semmancheri, Sholinganallur', boothNo: 'Booth 02 – Academic Block' },
            ],
          },
          {
            area: 'Karapakkam & Thoraipakkam',
            pin: '600097',
            booths: [
              { name: 'D.B. Jain College Humanities Wing', type: 'College', street: '72 Jyothi Nagar, Thoraipakkam', boothNo: 'Booth 03 – Lecture Hall 2' },
              { name: 'Panchayat Union Middle School, Karapakkam', type: 'School', street: '19 School Street, Karapakkam', boothNo: 'Booth 04 – Ground Floor' },
            ],
          },
          {
            area: 'Medavakkam & Perumbakkam',
            pin: '600100',
            booths: [
              { name: 'Government Model School, Medavakkam', type: 'School', street: '33 Velachery Main Road, Medavakkam', boothNo: 'Booth 05 – North Wing' },
              { name: 'Perumbakkam Community Civic Centre', type: 'Community Hall', street: '8 Cheran Nagar, Perumbakkam', boothNo: 'Booth 06 – Main Hall' },
            ],
          },
        ],
      },
      {
        name: 'Velachery',
        code: 'TN-AC-026',
        areas: [
          {
            area: 'Velachery Bypass & Vijayanagar',
            pin: '600042',
            booths: [
              { name: 'Chennai Higher Secondary School, Velachery', type: 'School', street: '28 100 Feet Bypass Road, Velachery', boothNo: 'Booth 01 – Ground Block' },
              { name: 'Guru Nanak College Civic Examination Hall', type: 'College', street: '161 Guru Nanak Salai, Velachery', boothNo: 'Booth 02 – Auditorium Annex' },
            ],
          },
          {
            area: 'Taramani & Adyar Border',
            pin: '600113',
            booths: [
              { name: 'Central Polytechnic College Campus, Taramani', type: 'College', street: '45 CPT Road, Taramani', boothNo: 'Booth 03 – Seminar Wing' },
              { name: 'Taramani Government Primary School', type: 'School', street: '12 MGR Salai, Taramani', boothNo: 'Booth 04 – Room 04' },
            ],
          },
          {
            area: 'Guindy & Madipakkam North',
            pin: '600032',
            booths: [
              { name: 'Anna University Guindy Engineering Annex', type: 'College', street: '12 Sardar Patel Road, Guindy', boothNo: 'Booth 05 – West Pavilion' },
            ],
          },
        ],
      },
      {
        name: 'Anna Nagar',
        code: 'TN-AC-021',
        areas: [
          {
            area: 'Anna Nagar East & Shenoy Nagar',
            pin: '600102',
            booths: [
              { name: 'Chennai Girls Higher Secondary School, Shenoy Nagar', type: 'School', street: '15 Pulla Avenue, Shenoy Nagar', boothNo: 'Booth 01 – Main Wing' },
              { name: 'Valliammal College for Women, Anna Nagar East', type: 'College', street: '44 E-Block, Anna Nagar East', boothNo: 'Booth 02 – Ground Hall' },
            ],
          },
          {
            area: 'Anna Nagar West & Mogappair Border',
            pin: '600040',
            booths: [
              { name: 'SBOA Matriculation & Higher Secondary School', type: 'School', street: '18 School Road, Anna Nagar West Extension', boothNo: 'Booth 03 – North Block' },
            ],
          },
        ],
      },
      {
        name: 'Mylapore',
        code: 'TN-AC-025',
        areas: [
          {
            area: 'Mylapore Tank & Luz Corner',
            pin: '600004',
            booths: [
              { name: 'P.S. Higher Secondary School, Mylapore', type: 'School', street: '215 R.K. Mutt Road, Mylapore', boothNo: 'Booth 01 – Heritage Hall' },
              { name: 'Vivekananda College, Mylapore', type: 'College', street: '47 Sivaswamy Salai, Mylapore', boothNo: 'Booth 02 – Main Auditorium' },
            ],
          },
          {
            area: 'Alwarpet & Mandaveli',
            pin: '600028',
            booths: [
              { name: 'Vidya Mandir Senior Secondary School', type: 'School', street: '124 Royapettah High Road, Mylapore', boothNo: 'Booth 03 – Ground Wing' },
            ],
          },
        ],
      },
      {
        name: 'Saidapet',
        code: 'TN-AC-023',
        areas: [
          {
            area: 'Saidapet West & CIT Nagar',
            pin: '600015',
            booths: [
              { name: 'Govt. Model Higher Secondary School, Saidapet', type: 'School', street: '58 Anna Salai, Saidapet', boothNo: 'Booth 01 – Room 02' },
              { name: 'YMCA College of Physical Education, Nandanam', type: 'College', street: '33 Anna Salai, Nandanam', boothNo: 'Booth 02 – Indoor Pavilion' },
            ],
          },
        ],
      },
      {
        name: 'T. Nagar',
        code: 'TN-AC-024',
        areas: [
          {
            area: 'Panagal Park & West Mambalam',
            pin: '600017',
            booths: [
              { name: 'RKM Sarada Vidyalaya Girls School', type: 'School', street: '24 Usman Road, T. Nagar', boothNo: 'Booth 01 – Ground Wing' },
              { name: 'Justice Basheer Ahmed Sayeed College, Teynampet', type: 'College', street: '56 KB Dasan Road, Teynampet', boothNo: 'Booth 02 – West Block' },
            ],
          },
        ],
      },
      {
        name: 'Royapuram',
        code: 'TN-AC-017',
        areas: [
          {
            area: 'Royapuram Harbour & Kasimedu',
            pin: '600013',
            booths: [
              { name: 'St. Peters Higher Secondary School, Royapuram', type: 'School', street: '31 M.S. Koil Street, Royapuram', boothNo: 'Booth 01 – North Hall' },
              { name: 'Bharathi Womens College, Broadway', type: 'College', street: '1 Prakasam Salai, North Chennai', boothNo: 'Booth 02 – Main Block' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Chengalpattu',
    prefix: 'CGL',
    basePin: '600045',
    lat: 12.9249,
    lng: 80.1,
    constituencies: [
      {
        name: 'Tambaram',
        code: 'TN-AC-031',
        areas: [
          {
            area: 'East Tambaram & Selaiyur',
            pin: '600059',
            booths: [
              { name: 'Madras Christian College (MCC) Campus Hall, East Tambaram', type: 'College', street: '101 Velachery Main Road, East Tambaram', boothNo: 'Booth 01 – Anderson Hall' },
              { name: 'Govt. Higher Secondary School, Selaiyur', type: 'School', street: '24 Camp Road, Selaiyur', boothNo: 'Booth 02 – Ground Wing' },
            ],
          },
          {
            area: 'West Tambaram & Mudichur',
            pin: '600045',
            booths: [
              { name: 'Corley Higher Secondary School, West Tambaram', type: 'School', street: '14 Gandhi Road, West Tambaram', boothNo: 'Booth 03 – North Classroom' },
              { name: 'Tambaram Municipal Community Hall', type: 'Community Hall', street: '8 Shanmugam Road, West Tambaram', boothNo: 'Booth 04 – Main Hall' },
            ],
          },
        ],
      },
      {
        name: 'Pallavaram',
        code: 'TN-AC-030',
        areas: [
          {
            area: 'Chromepet & Hasthinapuram',
            pin: '600044',
            booths: [
              { name: 'MIT Anna University Campus Block, Chromepet', type: 'College', street: '62 GST Road, Chromepet', boothNo: 'Booth 01 – Auditorium' },
              { name: 'Govt. Municipal High School, Pallavaram', type: 'School', street: '19 Bazaar Road, Pallavaram', boothNo: 'Booth 02 – Room 03' },
            ],
          },
        ],
      },
      {
        name: 'Chengalpattu',
        code: 'TN-AC-032',
        areas: [
          {
            area: 'Chengalpattu Town & Maraimalai Nagar',
            pin: '603001',
            booths: [
              { name: 'Rajeswari Vedachalam Government Arts College', type: 'College', street: '88 GST Road, Chengalpattu', boothNo: 'Booth 01 – Science Wing' },
              { name: 'St. Joseph Higher Secondary School, Chengalpattu', type: 'School', street: '12 Anna Salai, Chengalpattu', boothNo: 'Booth 02 – Block B' },
            ],
          },
        ],
      },
      {
        name: 'Madurantakam',
        code: 'TN-AC-035',
        areas: [
          {
            area: 'Madurantakam Town & Karunguzhi',
            pin: '603306',
            booths: [
              { name: 'Govt. Boys Higher Secondary School, Madurantakam', type: 'School', street: '45 Lake View Road, Madurantakam', boothNo: 'Booth 01 – Main Wing' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Thiruvallur',
    prefix: 'TRV',
    basePin: '600054',
    lat: 13.1143,
    lng: 80.1098,
    constituencies: [
      {
        name: 'Avadi',
        code: 'TN-AC-006',
        areas: [
          {
            area: 'Avadi HVF Estate & Tank Factory Road',
            pin: '600054',
            booths: [
              { name: 'Kendriya Vidyalaya HVF Campus, Avadi', type: 'School', street: '18 Tank Factory Road, Avadi', boothNo: 'Booth 01 – Ground Wing' },
              { name: 'Vel Tech Rangarajan Polytechnic College Hall, Avadi', type: 'College', street: '42 Alamathi Road, Avadi', boothNo: 'Booth 02 – Academic Block' },
            ],
          },
          {
            area: 'Thirumullaivoyal & Pattabiram',
            pin: '600062',
            booths: [
              { name: 'Nazareth College of Arts and Science, Avadi', type: 'College', street: '90 Kovilpathagai Main Road, Avadi', boothNo: 'Booth 03 – Seminar Hall' },
              { name: 'Govt. Higher Secondary School, Pattabiram', type: 'School', street: '27 MTH Road, Pattabiram', boothNo: 'Booth 04 – East Room' },
            ],
          },
        ],
      },
      {
        name: 'Ambattur',
        code: 'TN-AC-008',
        areas: [
          {
            area: 'Ambattur OT & Industrial Estate',
            pin: '600053',
            booths: [
              { name: 'Sir Ramaswami Mudaliar Higher Secondary School, Ambattur', type: 'School', street: '14 MTH Road, Ambattur', boothNo: 'Booth 01 – Main Block' },
              { name: 'Annai Violet Arts & Science College, Ambattur', type: 'College', street: '53 Menambedu, Ambattur', boothNo: 'Booth 02 – Ground Hall' },
            ],
          },
        ],
      },
      {
        name: 'Madhavaram',
        code: 'TN-AC-009',
        areas: [
          {
            area: 'Madhavaram Milk Colony & Puzhal',
            pin: '600051',
            booths: [
              { name: 'Govt. Higher Secondary School, Madhavaram', type: 'School', street: '36 Milk Colony Road, Madhavaram', boothNo: 'Booth 01 – North Wing' },
              { name: 'TANUVAS Civic Auditorium, Madhavaram', type: 'College', street: '101 Grand Northern Trunk Road, Madhavaram', boothNo: 'Booth 02 – Hall A' },
            ],
          },
        ],
      },
      {
        name: 'Poonamallee',
        code: 'TN-AC-005',
        areas: [
          {
            area: 'Poonamallee Trunk Road & Kumananchavadi',
            pin: '600056',
            booths: [
              { name: 'Govt. Boys Higher Secondary School, Poonamallee', type: 'School', street: '77 Trunk Road, Poonamallee', boothNo: 'Booth 01 – Main Hall' },
            ],
          },
        ],
      },
      {
        name: 'Tiruvallur',
        code: 'TN-AC-004',
        areas: [
          {
            area: 'Tiruvallur Periyakuppam & Town',
            pin: '602001',
            booths: [
              { name: 'R.M. Jain Govt. Girls Higher Secondary School', type: 'School', street: '15 J.N. Road, Tiruvallur', boothNo: 'Booth 01 – Ground Room' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Coimbatore',
    prefix: 'CBE',
    basePin: '641001',
    lat: 11.0168,
    lng: 76.9558,
    constituencies: [
      {
        name: 'Coimbatore North',
        code: 'TN-AC-118',
        areas: [
          {
            area: 'RS Puram & Sai Baba Colony',
            pin: '641002',
            booths: [
              { name: 'PSG College of Arts & Science Civic Wing', type: 'College', street: '85 Avinashi Road, Peelamedu', boothNo: 'Booth 01 – Hall C' },
              { name: 'Corporation Higher Secondary School, RS Puram', type: 'School', street: '39 Diwan Bahadur Road, RS Puram', boothNo: 'Booth 02 – Room 01' },
            ],
          },
          {
            area: 'Thudiyalur & Kavundampalayam',
            pin: '641034',
            booths: [
              { name: 'Govt. Higher Secondary School, Thudiyalur', type: 'School', street: '64 Mettupalayam Road, Thudiyalur', boothNo: 'Booth 03 – Block A' },
            ],
          },
        ],
      },
      {
        name: 'Coimbatore South',
        code: 'TN-AC-120',
        areas: [
          {
            area: 'Race Course & Town Hall',
            pin: '641018',
            booths: [
              { name: 'Government Arts College, Coimbatore', type: 'College', street: '12 Arts College Road, Race Course', boothNo: 'Booth 01 – Heritage Hall' },
              { name: 'Stanes Anglo Indian Higher Secondary School', type: 'School', street: '104 Avinashi Road, Race Course', boothNo: 'Booth 02 – East Wing' },
            ],
          },
        ],
      },
      {
        name: 'Singanallur',
        code: 'TN-AC-121',
        areas: [
          {
            area: 'Peelamedu & Singanallur',
            pin: '641005',
            booths: [
              { name: 'PSG Institute of Technology Examination Hall', type: 'College', street: '120 Avinashi Road, Peelamedu', boothNo: 'Booth 01 – Main Wing' },
              { name: 'Corporation Middle School, Singanallur', type: 'School', street: '45 Trichy Road, Singanallur', boothNo: 'Booth 02 – Ground Floor' },
            ],
          },
        ],
      },
      {
        name: 'Pollachi',
        code: 'TN-AC-123',
        areas: [
          {
            area: 'Pollachi Mahalingapuram',
            pin: '642002',
            booths: [
              { name: 'Nallamuthu Gounder Mahalingam College, Pollachi', type: 'College', street: '90 Palghat Road, Pollachi', boothNo: 'Booth 01 – Ground Block' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Madurai',
    prefix: 'MDU',
    basePin: '625001',
    lat: 9.9252,
    lng: 78.1198,
    constituencies: [
      {
        name: 'Madurai East',
        code: 'TN-AC-189',
        areas: [
          {
            area: 'Othakadai & Anna Nagar East',
            pin: '625020',
            booths: [
              { name: 'Thiagarajar College Civic Auditorium, Teppakulam', type: 'College', street: '139 Kamarajar Salai, Madurai', boothNo: 'Booth 01 – North Wing' },
              { name: 'Govt. Higher Secondary School, Othakadai', type: 'School', street: '22 Melur Main Road, Othakadai', boothNo: 'Booth 02 – Main Block' },
            ],
          },
        ],
      },
      {
        name: 'Madurai Central',
        code: 'TN-AC-193',
        areas: [
          {
            area: 'Simmakkal & West Masi Street',
            pin: '625001',
            booths: [
              { name: 'Madurai College Higher Secondary School', type: 'School', street: '41 TPK Road, Madurai Central', boothNo: 'Booth 01 – Ground Wing' },
              { name: 'American College Jubilee Hall, Tallakulam', type: 'College', street: '18 Alagar Kovil Road, Tallakulam', boothNo: 'Booth 02 – Hall B' },
            ],
          },
        ],
      },
      {
        name: 'Madurai West',
        code: 'TN-AC-194',
        areas: [
          {
            area: 'Kalavasal & Ellis Nagar',
            pin: '625016',
            booths: [
              { name: 'Fatima College Campus Hall, Maryland', type: 'College', street: '75 Dindigul Main Road, Madurai', boothNo: 'Booth 01 – Assembly Hall' },
            ],
          },
        ],
      },
      {
        name: 'Tirumangalam',
        code: 'TN-AC-196',
        areas: [
          {
            area: 'Tirumangalam Town',
            pin: '625706',
            booths: [
              { name: 'P.K.N. Boys Higher Secondary School, Tirumangalam', type: 'School', street: '33 Madurai Road, Tirumangalam', boothNo: 'Booth 01 – East Block' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Salem',
    prefix: 'SLM',
    basePin: '636001',
    lat: 11.6643,
    lng: 78.146,
    constituencies: [
      {
        name: 'Salem North',
        code: 'TN-AC-089',
        areas: [
          {
            area: 'Fairlands & Hasthampatti',
            pin: '636016',
            booths: [
              { name: 'Sarada College for Women Civic Hall, Fairlands', type: 'College', street: '48 Sarada College Road, Fairlands, Salem', boothNo: 'Booth 01 – Main Wing' },
              { name: 'CSI Higher Secondary School, Hasthampatti', type: 'School', street: '15 Yercaud Main Road, Hasthampatti', boothNo: 'Booth 02 – Ground Floor' },
            ],
          },
          {
            area: 'Five Roads & Alagapuram',
            pin: '636004',
            booths: [
              { name: 'Government Higher Secondary School, Alagapuram', type: 'School', street: '29 Five Roads Junction, Salem', boothNo: 'Booth 03 – North Block' },
            ],
          },
        ],
      },
      {
        name: 'Salem South',
        code: 'TN-AC-090',
        areas: [
          {
            area: 'Kondalampatti & Seelanaickenpatti',
            pin: '636010',
            booths: [
              { name: 'Government Polytechnic College, Salem', type: 'College', street: '112 Trichy Main Road, Salem', boothNo: 'Booth 01 – Workshop Wing' },
              { name: 'Municipal High School, Kondalampatti', type: 'School', street: '14 Bypass Road, Kondalampatti', boothNo: 'Booth 02 – Room 03' },
            ],
          },
        ],
      },
      {
        name: 'Salem West',
        code: 'TN-AC-088',
        areas: [
          {
            area: 'Suramangalam & Junction',
            pin: '636005',
            booths: [
              { name: 'Sona College of Technology Auditorium, Suramangalam', type: 'College', street: '71 Junction Main Road, Salem', boothNo: 'Booth 01 – Block A' },
            ],
          },
        ],
      },
      {
        name: 'Mettur',
        code: 'TN-AC-085',
        areas: [
          {
            area: 'Mettur Dam & Thermal Colony',
            pin: '636401',
            booths: [
              { name: 'Govt. Boys Higher Secondary School, Mettur Dam', type: 'School', street: '22 Cauvery Nagar, Mettur Dam', boothNo: 'Booth 01 – Main Room' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Tiruchirappalli',
    prefix: 'TRY',
    basePin: '620001',
    lat: 10.7905,
    lng: 78.7047,
    constituencies: [
      {
        name: 'Tiruchirappalli East',
        code: 'TN-AC-141',
        areas: [
          {
            area: 'Thillai Nagar & Cantonment',
            pin: '620018',
            booths: [
              { name: 'St. Josephs College Autonomous Hall, Teppakulam', type: 'College', street: '32 College Road, Tiruchirappalli', boothNo: 'Booth 01 – Lawley Hall' },
              { name: 'Bishop Heber Higher Secondary School, Puthur', type: 'School', street: '14 Vayalur Road, Puthur', boothNo: 'Booth 02 – Main Block' },
            ],
          },
        ],
      },
      {
        name: 'Tiruchirappalli West',
        code: 'TN-AC-140',
        areas: [
          {
            area: 'Woraiyur & K.K. Nagar',
            pin: '620021',
            booths: [
              { name: 'National College Civic Wing, Dindigul Road', type: 'College', street: '94 Karumandapam, Tiruchirappalli', boothNo: 'Booth 01 – Block B' },
            ],
          },
        ],
      },
      {
        name: 'Srirangam',
        code: 'TN-AC-139',
        areas: [
          {
            area: 'Srirangam Amma Mandapam & Thiruvanaikoil',
            pin: '620006',
            booths: [
              { name: 'Srimad Andavan Arts & Science College, Thiruvanaikoil', type: 'College', street: '7 Nelson Road, Thiruvanaikoil', boothNo: 'Booth 01 – Ground Hall' },
              { name: 'Boys Higher Secondary School, Srirangam', type: 'School', street: '45 East Chithirai Street, Srirangam', boothNo: 'Booth 02 – Room 02' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Tirunelveli',
    prefix: 'TIN',
    basePin: '627001',
    lat: 8.7139,
    lng: 77.7567,
    constituencies: [
      {
        name: 'Tirunelveli',
        code: 'TN-AC-224',
        areas: [
          {
            area: 'Tirunelveli Town & Junction',
            pin: '627001',
            booths: [
              { name: 'MDT Hindu College Higher Secondary School', type: 'School', street: '28 Swami Nellaiappar High Road, Tirunelveli', boothNo: 'Booth 01 – Main Wing' },
            ],
          },
        ],
      },
      {
        name: 'Palayamkottai',
        code: 'TN-AC-226',
        areas: [
          {
            area: 'Palayamkottai St. Xavier Colony',
            pin: '627002',
            booths: [
              { name: 'St. Xaviers College Auditorium, Palayamkottai', type: 'College', street: '112 North High Ground Road, Palayamkottai', boothNo: 'Booth 01 – Science Hall' },
              { name: 'Sarah Tucker Girls Higher Secondary School', type: 'School', street: '19 Perumalpuram, Palayamkottai', boothNo: 'Booth 02 – Ground Wing' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Erode',
    prefix: 'ERD',
    basePin: '638001',
    lat: 11.341,
    lng: 77.7172,
    constituencies: [
      {
        name: 'Erode East',
        code: 'TN-AC-098',
        areas: [
          {
            area: 'Brough Road & Sampath Nagar',
            pin: '638001',
            booths: [
              { name: 'Chikkaiah Naicker College, Veerappanchatram', type: 'College', street: '64 Perundurai Road, Erode', boothNo: 'Booth 01 – Ground Block' },
              { name: 'Govt. Girls Higher Secondary School, Erode', type: 'School', street: '12 Brough Road, Erode', boothNo: 'Booth 02 – Main Hall' },
            ],
          },
        ],
      },
      {
        name: 'Erode West',
        code: 'TN-AC-099',
        areas: [
          {
            area: 'Perundurai Road & Nasiyanur',
            pin: '638011',
            booths: [
              { name: 'Kongu Engineering Civic Annex, Perundurai', type: 'College', street: '90 Perundurai Highway, Erode', boothNo: 'Booth 01 – Block C' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Vellore',
    prefix: 'VLR',
    basePin: '632001',
    lat: 12.9165,
    lng: 79.1325,
    constituencies: [
      {
        name: 'Vellore',
        code: 'TN-AC-043',
        areas: [
          {
            area: 'Vellore Fort & Sathuvachari',
            pin: '632009',
            booths: [
              { name: 'Voorhees College Main Hall, Vellore', type: 'College', street: '34 Officers Line, Vellore', boothNo: 'Booth 01 – Heritage Block' },
              { name: 'Govt. Muslim Higher Secondary School, Vellore', type: 'School', street: '18 Long Bazaar, Vellore', boothNo: 'Booth 02 – Ground Wing' },
            ],
          },
        ],
      },
      {
        name: 'Katpadi',
        code: 'TN-AC-040',
        areas: [
          {
            area: 'Katpadi & Thiruvalam Road',
            pin: '632014',
            booths: [
              { name: 'VIT Civic Convention Wing, Katpadi', type: 'College', street: '101 Tiruvalam Road, Katpadi', boothNo: 'Booth 01 – Anna Auditorium' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Thanjavur',
    prefix: 'TNJ',
    basePin: '613001',
    lat: 10.787,
    lng: 79.1378,
    constituencies: [
      {
        name: 'Thanjavur',
        code: 'TN-AC-174',
        areas: [
          {
            area: 'Medical College Road & Big Temple Quarter',
            pin: '613004',
            booths: [
              { name: 'Rajah Serfoji Government College, Thanjavur', type: 'College', street: '52 Medical College Road, Thanjavur', boothNo: 'Booth 01 – Academic Block' },
              { name: 'Blake Higher Secondary School, Thanjavur', type: 'School', street: '19 Gandhiji Road, Thanjavur', boothNo: 'Booth 02 – Room 01' },
            ],
          },
        ],
      },
      {
        name: 'Kumbakonam',
        code: 'TN-AC-171',
        areas: [
          {
            area: 'Mahamaham Tank & Town High School',
            pin: '612001',
            booths: [
              { name: 'Government Arts College (Autonomous), Kumbakonam', type: 'College', street: '24 Cauvery Bank Road, Kumbakonam', boothNo: 'Booth 01 – Main Wing' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Tiruppur',
    prefix: 'TPR',
    basePin: '641601',
    lat: 11.1085,
    lng: 77.3411,
    constituencies: [
      {
        name: 'Tiruppur North',
        code: 'TN-AC-113',
        areas: [
          {
            area: 'Avinashi Road & Kumar Nagar',
            pin: '641603',
            booths: [
              { name: 'Chikkanna Government Arts College, Tiruppur', type: 'College', street: '45 College Road, Tiruppur', boothNo: 'Booth 01 – Block A' },
            ],
          },
        ],
      },
      {
        name: 'Tiruppur South',
        code: 'TN-AC-114',
        areas: [
          {
            area: 'Palladam Road & Veerapandi',
            pin: '641604',
            booths: [
              { name: 'Jaivabai Municipal Girls Higher Secondary School', type: 'School', street: '18 Town Hall Road, Tiruppur', boothNo: 'Booth 01 – Ground Wing' },
            ],
          },
        ],
      },
    ],
  },
  {
    district: 'Thoothukudi',
    prefix: 'TTK',
    basePin: '628001',
    lat: 8.7642,
    lng: 78.1348,
    constituencies: [
      {
        name: 'Thoothukudi',
        code: 'TN-AC-214',
        areas: [
          {
            area: 'Bryant Nagar & Palayamkottai Road',
            pin: '628008',
            booths: [
              { name: 'V.O. Chidambaram College Civic Hall, Thoothukudi', type: 'College', street: '62 Palayamkottai Road, Thoothukudi', boothNo: 'Booth 01 – Main Hall' },
              { name: 'Caldwell Higher Secondary School, Thoothukudi', type: 'School', street: '11 Beach Road, Thoothukudi', boothNo: 'Booth 02 – Room 04' },
            ],
          },
        ],
      },
      {
        name: 'Tiruchendur',
        code: 'TN-AC-215',
        areas: [
          {
            area: 'Tiruchendur Main Bazaar',
            pin: '628215',
            booths: [
              { name: 'Aditanar College of Arts and Science, Tiruchendur', type: 'College', street: '40 Veerapandianpatnam, Tiruchendur', boothNo: 'Booth 01 – Block A' },
            ],
          },
        ],
      },
    ],
  },
];

// Remaining 25 Tamil Nadu districts to ensure complete 38-district coverage
const REGIONAL_TN_DISTRICTS: Array<{
  district: string;
  prefix: string;
  pin: string;
  lat: number;
  lng: number;
  constituencies: Array<{ name: string; code: string; area: string; school: string; college: string }>;
}> = [
  {
    district: 'Kancheepuram',
    prefix: 'KPM',
    pin: '631501',
    lat: 12.8342,
    lng: 79.7036,
    constituencies: [
      { name: 'Kancheepuram', code: 'TN-AC-037', area: 'Little Kancheepuram & Ennaikaran', school: 'Anderson Higher Secondary School, Kancheepuram', college: 'Pachaiyappas College for Men, Kancheepuram' },
      { name: 'Sriperumbudur', code: 'TN-AC-029', area: 'Sriperumbudur Industrial Belt', school: 'Govt. Boys Higher Secondary School, Sriperumbudur', college: 'Sri Venkateswara College of Engineering Wing' },
    ],
  },
  {
    district: 'Dindigul',
    prefix: 'DGL',
    pin: '624001',
    lat: 10.3624,
    lng: 77.9695,
    constituencies: [
      { name: 'Dindigul', code: 'TN-AC-132', area: 'Begambur & Mengles Road', school: 'MSP Solai Nadar Memorial Higher Secondary School', college: 'GTN Arts College, Karur Road, Dindigul' },
      { name: 'Palani', code: 'TN-AC-130', area: 'Palani Adivaram & Town', school: 'Municipal Boys Higher Secondary School, Palani', college: 'Arulmigu Palaniandavar College of Arts and Culture' },
    ],
  },
  {
    district: 'Kanniyakumari',
    prefix: 'KKM',
    pin: '629001',
    lat: 8.1833,
    lng: 77.4119,
    constituencies: [
      { name: 'Nagercoil', code: 'TN-AC-230', area: 'Vadasery & Kottar', school: 'SLB Govt. Higher Secondary School, Nagercoil', college: 'Scott Christian College, Nagercoil' },
      { name: 'Kanniyakumari', code: 'TN-AC-229', area: 'Suchindram & Cape Road', school: 'Govt. Higher Secondary School, Suchindram', college: 'Vivekananda College, Agastheeswaram' },
    ],
  },
  {
    district: 'Cuddalore',
    prefix: 'CDL',
    pin: '607001',
    lat: 11.748,
    lng: 79.7714,
    constituencies: [
      { name: 'Cuddalore', code: 'TN-AC-155', area: 'Manjakuppam & Silver Beach Road', school: 'St. Josephs Higher Secondary School, Manjakuppam', college: 'Periyar Arts College, Devanampattinam' },
      { name: 'Chidambaram', code: 'TN-AC-158', area: 'Annamalai Nagar & East Car Street', school: 'Pachaiyappas Higher Secondary School, Chidambaram', college: 'Annamalai University Civic Examination Hall' },
    ],
  },
  {
    district: 'Villupuram',
    prefix: 'VPM',
    pin: '605602',
    lat: 11.9401,
    lng: 79.4861,
    constituencies: [
      { name: 'Villupuram', code: 'TN-AC-074', area: 'Villupuram Junction & Trichy Trunk Road', school: 'Municipal Boys Higher Secondary School, Villupuram', college: 'Theivanai Ammal College for Women, Villupuram' },
      { name: 'Tindivanam', code: 'TN-AC-072', area: 'Tindivanam Gingee Road', school: 'Walter Scudder High School, Tindivanam', college: 'Thiru. A. Govindasamy Government Arts College' },
    ],
  },
  {
    district: 'Namakkal',
    prefix: 'NMK',
    pin: '637001',
    lat: 11.2189,
    lng: 78.1674,
    constituencies: [
      { name: 'Namakkal', code: 'TN-AC-094', area: 'Salem Road & Fort Area', school: 'Govt. Boys Higher Secondary School, Namakkal South', college: 'Arignar Anna Government Arts College, Namakkal' },
      { name: 'Tiruchengode', code: 'TN-AC-096', area: 'Velur Road & Kailasanathar Hill Base', school: 'Govt. Girls Higher Secondary School, Tiruchengode', college: 'KSR College of Engineering Civic Wing' },
    ],
  },
  {
    district: 'Karur',
    prefix: 'KRR',
    pin: '639001',
    lat: 10.9601,
    lng: 78.0766,
    constituencies: [
      { name: 'Karur', code: 'TN-AC-135', area: 'Thanthonimalai & Jawahar Bazaar', school: 'Municipal Higher Secondary School, Azad Road, Karur', college: 'Government Arts College, Thanthonimalai, Karur' },
    ],
  },
  {
    district: 'Sivaganga',
    prefix: 'SVG',
    pin: '630561',
    lat: 9.8433,
    lng: 78.4809,
    constituencies: [
      { name: 'Sivaganga', code: 'TN-AC-186', area: 'Madurai Road & Aranmanai', school: 'Raja Doraisingam Memorial High School', college: 'Raja Doraisingam Government Arts College, Sivaganga' },
      { name: 'Karaikudi', code: 'TN-AC-184', area: 'Sekkalai & Alagappapuram', school: 'SMS Vidyalaya Higher Secondary School, Karaikudi', college: 'Alagappa Government Arts College, Karaikudi' },
    ],
  },
  {
    district: 'Virudhunagar',
    prefix: 'VNR',
    pin: '626001',
    lat: 9.568,
    lng: 77.9624,
    constituencies: [
      { name: 'Virudhunagar', code: 'TN-AC-206', area: 'Katcheri Road & Municipal Colony', school: 'KVS Higher Secondary School, Virudhunagar', college: 'VHNSN College Civic Hall, Virudhunagar' },
      { name: 'Sivakasi', code: 'TN-AC-205', area: 'Sattur Road & Thiruthangal', school: 'SHN Edward Higher Secondary School, Sivakasi', college: 'Ayya Nadar Janaki Ammal College, Sivakasi' },
    ],
  },
  {
    district: 'Krishnagiri',
    prefix: 'KRI',
    pin: '635001',
    lat: 12.5186,
    lng: 78.2137,
    constituencies: [
      { name: 'Krishnagiri', code: 'TN-AC-053', area: 'Rayakottai Road & Oldpet', school: 'Govt. Boys Higher Secondary School, Krishnagiri', college: 'Government Arts College for Men, Krishnagiri' },
      { name: 'Hosur', code: 'TN-AC-055', area: 'Bagalur Road & SIPCOT Phase I', school: 'RV Govt. Boys Higher Secondary School, Hosur', college: 'Adhiyamaan College of Engineering Civic Block, Hosur' },
    ],
  },
  {
    district: 'Dharmapuri',
    prefix: 'DPI',
    pin: '636701',
    lat: 12.1211,
    lng: 78.1582,
    constituencies: [
      { name: 'Dharmapuri', code: 'TN-AC-059', area: 'Pennagaram Road & Collectorate Area', school: 'Adhiyaman Govt. Boys Higher Secondary School', college: 'Government Arts College, Dharmapuri' },
    ],
  },
  {
    district: 'The Nilgiris',
    prefix: 'NLG',
    pin: '643001',
    lat: 11.4102,
    lng: 76.695,
    constituencies: [
      { name: 'Udhagamandalam', code: 'TN-AC-108', area: 'Charring Cross & Stonehouse Hill', school: 'Breeks Memorial Anglo Indian Higher Secondary School', college: 'Government Arts College, Udhagamandalam' },
      { name: 'Coonoor', code: 'TN-AC-109', area: 'Upper Coonoor & Bedford', school: 'Stanes Higher Secondary School, Coonoor', college: 'Providence College for Women, Coonoor' },
    ],
  },
  {
    district: 'Nagapattinam',
    prefix: 'NGP',
    pin: '611001',
    lat: 10.7672,
    lng: 79.8449,
    constituencies: [
      { name: 'Nagapattinam', code: 'TN-AC-163', area: 'Velipalayam & Public Office Road', school: 'National Higher Secondary School, Nagapattinam', college: 'ADM College for Women, Nagapattinam' },
    ],
  },
  {
    district: 'Pudukkottai',
    prefix: 'PDK',
    pin: '622001',
    lat: 10.3797,
    lng: 78.8208,
    constituencies: [
      { name: 'Pudukkottai', code: 'TN-AC-180', area: 'Santhanathapuram & East Main Street', school: 'Sri Brahadambal Govt. Higher Secondary School', college: 'H.H. The Rajahs College, Pudukkottai' },
    ],
  },
  {
    district: 'Ramanathapuram',
    prefix: 'RMD',
    pin: '623501',
    lat: 9.3639,
    lng: 78.8395,
    constituencies: [
      { name: 'Ramanathapuram', code: 'TN-AC-211', area: 'Bharathi Nagar & Aranmanai', school: 'Schwartz Higher Secondary School, Ramanathapuram', college: 'Sethupathy Government Arts College, Ramanathapuram' },
    ],
  },
  {
    district: 'Tiruvannamalai',
    prefix: 'TVM',
    pin: '606601',
    lat: 12.2253,
    lng: 79.0747,
    constituencies: [
      { name: 'Tiruvannamalai', code: 'TN-AC-063', area: 'Gandhi Nagar & Polur Road', school: 'Danish Mission Higher Secondary School, Tiruvannamalai', college: 'Arignar Anna Government Arts College, Cheyyar Road' },
    ],
  },
  {
    district: 'Ranipet',
    prefix: 'RPT',
    pin: '632401',
    lat: 12.927,
    lng: 79.333,
    constituencies: [
      { name: 'Ranipet', code: 'TN-AC-041', area: 'Walajapet & SIPCOT Ranipet', school: 'Govt. Boys Higher Secondary School, Walajapet', college: 'Muthurangam Government Arts College Annex, Ranipet' },
      { name: 'Arakkonam', code: 'TN-AC-038', area: 'Arakkonam Railway Junction & Town', school: 'CSI St. Andrews Higher Secondary School, Arakkonam', college: 'Government Arts and Science College, Arakkonam' },
    ],
  },
  {
    district: 'Tirupathur',
    prefix: 'TPT',
    pin: '635601',
    lat: 12.495,
    lng: 78.5678,
    constituencies: [
      { name: 'Tirupathur', code: 'TN-AC-050', area: 'Koviloor Road & Town Centre', school: 'Meenakshi Govt. Girls Higher Secondary School, Tirupathur', college: 'Sacred Heart College (Autonomous), Tirupathur' },
    ],
  },
  {
    district: 'Kallakurichi',
    prefix: 'KLK',
    pin: '606202',
    lat: 11.7384,
    lng: 78.9639,
    constituencies: [
      { name: 'Kallakurichi', code: 'TN-AC-078', area: 'Salem Main Road & Kachirapalayam', school: 'Bharathi Matriculation Higher Secondary School', college: 'Government Arts and Science College, Kallakurichi' },
    ],
  },
  {
    district: 'Ariyalur',
    prefix: 'ARY',
    pin: '621704',
    lat: 11.1401,
    lng: 79.0786,
    constituencies: [
      { name: 'Ariyalur', code: 'TN-AC-149', area: 'Sendurai Road & Market Street', school: 'Govt. Higher Secondary School, Ariyalur', college: 'Government Arts College, Ariyalur' },
    ],
  },
  {
    district: 'Perambalur',
    prefix: 'PBL',
    pin: '621212',
    lat: 11.2342,
    lng: 78.8807,
    constituencies: [
      { name: 'Perambalur', code: 'TN-AC-147', area: 'New Bus Stand & Thuraimangalam', school: 'Govt. Higher Secondary School, Perambalur', college: 'Thanthai Hans Roever College, Perambalur' },
    ],
  },
  {
    district: 'Tiruvarur',
    prefix: 'TVR',
    pin: '610001',
    lat: 10.7726,
    lng: 79.6368,
    constituencies: [
      { name: 'Tiruvarur', code: 'TN-AC-168', area: 'Vijayapuram & Kamalalayam North', school: 'V.S. Boys Higher Secondary School, Tiruvarur', college: 'Thiru.Vi.Ka. Government Arts College, Tiruvarur' },
    ],
  },
  {
    district: 'Mayiladuthurai',
    prefix: 'MYD',
    pin: '609001',
    lat: 11.1025,
    lng: 79.655,
    constituencies: [
      { name: 'Mayiladuthurai', code: 'TN-AC-161', area: 'Koranad & Pattamangalam Street', school: 'National Higher Secondary School, Mayiladuthurai', college: 'A.V.C. College (Autonomous), Mannampandal' },
    ],
  },
  {
    district: 'Theni',
    prefix: 'THN',
    pin: '625531',
    lat: 10.0104,
    lng: 77.4768,
    constituencies: [
      { name: 'Theni', code: 'TN-AC-199', area: 'Allinagaram & Periyakulam Road', school: 'Nadar Saraswathi Boys Higher Secondary School, Theni', college: 'Cardamom Planters Association College, Bodinayakanur' },
    ],
  },
  {
    district: 'Tenkasi',
    prefix: 'TKS',
    pin: '627811',
    lat: 8.9591,
    lng: 77.3152,
    constituencies: [
      { name: 'Tenkasi', code: 'TN-AC-222', area: 'Courtallam Road & Melagaram', school: 'I.C.I. Govt. Boys Higher Secondary School, Tenkasi', college: 'Sri Parasakthi College for Women, Courtallam' },
    ],
  },
];

export function buildTamilNaduDataset(): {
  constituencies: Array<{ name: string; code: string; district: string; state: string; registered_demo_voters: number }>;
  booths: TnBoothSeed[];
} {
  const constituencies: Array<{ name: string; code: string; district: string; state: string; registered_demo_voters: number }> = [];
  const booths: TnBoothSeed[] = [];

  let globalIdx = 1;

  for (const spec of DISTRICT_SPECS) {
    for (const c of spec.constituencies) {
      constituencies.push({
        name: c.name,
        code: c.code,
        district: spec.district,
        state: 'Tamil Nadu',
        registered_demo_voters: 185000 + ((globalIdx * 7319) % 95000),
      });

      let localCounter = 1;
      for (const areaObj of c.areas) {
        for (const b of areaObj.booths) {
          const codeNum = String(localCounter).padStart(2, '0');
          const stationCode = `TN-${spec.prefix}-${c.code.replace('TN-AC-', '')}-${codeNum}`;
          booths.push({
            station_code: stationCode,
            name: b.name,
            address: `${b.street}, ${spec.district}`,
            pin_code: areaObj.pin,
            district: spec.district,
            constituency_name: c.name,
            constituency_code: c.code,
            polling_area: areaObj.area,
            booth_number: b.boothNo,
            location_type: b.type,
            accessibility_facilities: ACCESSIBILITY_VARIANTS[(globalIdx + localCounter) % ACCESSIBILITY_VARIANTS.length],
            available_facilities: FACILITY_VARIANTS[(globalIdx + localCounter) % FACILITY_VARIANTS.length],
            latitude: Number((spec.lat + (localCounter - 1) * 0.0042).toFixed(4)),
            longitude: Number((spec.lng + (localCounter - 1) * 0.0038).toFixed(4)),
            registered_demo_voters: 185000,
          });
          localCounter += 1;
          globalIdx += 1;
        }
      }
    }
  }

  for (const reg of REGIONAL_TN_DISTRICTS) {
    for (const c of reg.constituencies) {
      constituencies.push({
        name: c.name,
        code: c.code,
        district: reg.district,
        state: 'Tamil Nadu',
        registered_demo_voters: 162000 + ((globalIdx * 5113) % 78000),
      });

      const areaBooths: Array<{ name: string; type: TnBoothSeed['location_type']; boothNo: string; areaSuffix: string }> = [
        { name: c.school, type: 'School', boothNo: 'Booth 01 – Ground Wing', areaSuffix: `${c.area} (Zone A)` },
        { name: c.college, type: 'College', boothNo: 'Booth 02 – Main Hall', areaSuffix: `${c.area} (Zone B)` },
      ];

      areaBooths.forEach((b, idx) => {
        const stationCode = `TN-${reg.prefix}-${c.code.replace('TN-AC-', '')}-${String(idx + 1).padStart(2, '0')}`;
        booths.push({
          station_code: stationCode,
          name: b.name,
          address: `Civic Station Road, ${c.area}, ${reg.district}`,
          pin_code: reg.pin,
          district: reg.district,
          constituency_name: c.name,
          constituency_code: c.code,
          polling_area: b.areaSuffix,
          booth_number: b.boothNo,
          location_type: b.type,
          accessibility_facilities: ACCESSIBILITY_VARIANTS[(globalIdx + idx) % ACCESSIBILITY_VARIANTS.length],
          available_facilities: FACILITY_VARIANTS[(globalIdx + idx) % FACILITY_VARIANTS.length],
          latitude: Number((reg.lat + idx * 0.0045).toFixed(4)),
          longitude: Number((reg.lng + idx * 0.0041).toFixed(4)),
          registered_demo_voters: 165000,
        });
        globalIdx += 1;
      });
    }
  }

  return { constituencies, booths };
}
