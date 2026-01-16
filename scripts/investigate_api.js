// using native fetch


// Headers from user's cURL
const headers = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  // Using the cookies provided in cURL
  'cookie': 'ajs_anonymous_id=092f4a92-ccb1-47d5-a97f-8e8baa11e4ee; _ga=GA1.1.405148242.1768447293; _mkto_trk=id:347-MEQ-363&token:_mch-cloudtrucks.com-737c18d5636e9990e8b2aee6d89bdf68; _gcl_au=1.1.1250692548.1768447292.905342984.1768447307.1768447308; __Secure-csrftoken-v2=loNMSGdok4L7VkiqLLvuz9NY6v7VoCg7; __Secure-sessionid-v2=gini0370hov5bpb6xioxkrrnv58ppcqw; ajs_user_id=b2d79575-5ea9-422e-9925-d603d122aaab; _uetsid=4a5f31a0f1c111f0ada24789208165b8; _uetvid=4a5f3160f1c111f08dc7bbe313b9186f; _hp2_ses_props.2401912710=%7B%22z%22%3A1%2C%22r%22%3A%22https%3A%2F%2Fapp.cloudtrucks.com%2Fjobs%2F%22%2C%22ts%22%3A1768522895942%2C%22d%22%3A%22app.cloudtrucks.com%22%2C%22h%22%3A%22%2Fsearch%2F%22%2C%22t%22%3A%22CloudTrucks%20-%20Business%20Management%20for%20Owner-Operators%22%7D; _clck=dbkuha%5E2%5Eg2r%5E0%5E2206; _ga_DGZEVQ4QLR=GS2.1.s1768524532$o7$g1$t1768524664$j58$l0$h454331188; _ga_LGJ1WX2Z7M=GS2.1.s1768524532$o7$g1$t1768524664$j58$l0$h0; _clsk=v8ujnz%5E1768525324093%5E13%5E1%5Eh.clarity.ms%2Fcollect; _lr_hb_-7zp8gw%2Fcloudtrucks-web={%22heartbeat%22:1768525358854}; _lr_tabs_-7zp8gw%2Fcloudtrucks-web={%22recordingID%22:%226-019bc42a-d8f6-7e0c-8bb6-c71892a62dfe%22%2C%22sessionID%22:0%2C%22lastActivity%22:1768525450532%2C%22hasActivity%22:true%2C%22confirmed%22:true%2C%22clearsIdentifiedUser%22:false}; _hp2_id.2401912710=%7B%22userId%22%3A%221143914858987305%22%2C%22pageviewId%22%3A%221814391658536576%22%2C%22sessionId%22%3A%222258309367022442%22%2C%22identity%22%3A%22b2d79575-5ea9-422e-9925-d603d122aaab%22%2C%22trackerVersion%22%3A%224.0%22%2C%22identityField%22%3Anull%2C%22isIdentified%22%3A1%7D',
  'origin': 'https://app.cloudtrucks.com',
  'referer': 'https://app.cloudtrucks.com/search/results/',
  'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'x-client': 'web',
  // Critical header for CSRF protection
  'x-csrftoken': 'loNMSGdok4L7VkiqLLvuz9NY6v7VoCg7',
  'x-web-app-release': '4d7195321bbe5df512906fd7e5a2ff50fdc10084'
};

const payload = {
  "origin_location": "San Jose, CA",
  "origin_range_mi__max": 50,
  "origin_pickup_date__min": "2026-01-15T00:00:00-08:00",
  "dest_location": "Las Vegas, NV",
  "dest_range_mi__max": 100,
  "equipment": ["DRY_VAN"],
  "sort_type": "BEST_PRICE",
  "booking_type": "ALL",
  "masked_data": true,
  "age_min__min": 5,
  "truck_weight_lb__max": 45000,
  "requested_states": [],
  "is_offline_book_compatible": true
};

async function testApi() {
  try {
    console.log('Sending request to CloudTrucks API (SYNC)...');
    const response = await fetch('https://app.cloudtrucks.com/api/v2/query_loads', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('Error response:', text);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testApi();
