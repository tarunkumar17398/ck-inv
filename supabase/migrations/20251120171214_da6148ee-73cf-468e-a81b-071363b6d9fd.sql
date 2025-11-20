
-- Add default_price column to subcategories
ALTER TABLE subcategories ADD COLUMN default_price numeric;

-- Update all existing Panchaloha subcategories with clean names and prices
UPDATE subcategories SET 
  subcategory_name = 'Ganesh w/Arch - 3 inch',
  default_price = 1000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ganesh w/Arch - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Dancing Ganesh - 4.5 inch',
  default_price = 1300
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Dancing Ganesh - 4.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Sitting Ganesh - 3inch',
  default_price = 1100
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Sitting Ganesh - 3inch%';

UPDATE subcategories SET 
  subcategory_name = 'Nataraja - 6 inch',
  default_price = 2100
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Nataraja - 6 inch - ₹2100%';

UPDATE subcategories SET 
  subcategory_name = 'Shivalingam Reg - 3 inch',
  default_price = 2100
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Shivalingam Reg - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Bairavar - 6 inch',
  default_price = 1900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Bairavar - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi - 3 inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi - 3 inch - ₹900%';

UPDATE subcategories SET 
  subcategory_name = 'Sarawathi - 3 inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Sarawathi - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Raja Alangara Murugan - 6 inch',
  default_price = 1750
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Raja Alangara Murugan - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Annapoorani - 3 inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Annapoorani - 3 inch - ₹800%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Hiyagrivar - 3.5 inch',
  default_price = 950
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Hiyagrivar - 3.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Varagar - 3 inch',
  default_price = 950
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Varagar - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Narayanan - 3 inch',
  default_price = 950
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Narayanan - 3 inch - ₹950%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Narasimar - 3 inch',
  default_price = 950
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Narasimar - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Sitting Hanuman - 2.5 inch',
  default_price = 750
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Sitting Hanuman - 2.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Standing Hanuman - 4inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Standing Hanuman - 4inch%';

UPDATE subcategories SET 
  subcategory_name = 'Varagi Amman - 4 inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Varagi Amman - 4 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Andal - 4inch',
  default_price = 850
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Andal - 4inch%';

UPDATE subcategories SET 
  subcategory_name = 'Meenakshi Amman - 4inch',
  default_price = 850
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Meenakshi Amman - 4inch%';

UPDATE subcategories SET 
  subcategory_name = 'Butter Krishna - 3 inch',
  default_price = 700
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Butter Krishna - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Gomada - 2 inch',
  default_price = 1300
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Gomada - 2 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Dancing Lady - 6 inch',
  default_price = 1750
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Dancing Lady - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Meru - 2 inch',
  default_price = 1200
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Meru - 2 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Buddha (W) - 3inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Buddha (W) - 3inch%';

UPDATE subcategories SET 
  subcategory_name = 'Buddha (M) - 3inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Buddha (M) - 3inch%';

UPDATE subcategories SET 
  subcategory_name = 'C. Krishna (S) - 2 inch',
  default_price = 700
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'C. Krishna (S) - 2 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Bogasakthi - 4 inch',
  default_price = 1000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Bogasakthi - 4 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Parvathi - 4inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Parvathi - 4inch - ₹800%';

UPDATE subcategories SET 
  subcategory_name = 'Ramanujar - 2inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ramanujar - 2inch - ₹800%';

UPDATE subcategories SET 
  subcategory_name = 'Kanchi Periyar - 4 inch',
  default_price = 2500
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Kanchi Periyar - 4 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ranganathar - 2inch',
  default_price = 2000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ranganathar - 2inch%';

UPDATE subcategories SET 
  subcategory_name = 'Perumal Set (3pc) - 6 inch',
  default_price = 5100
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Perumal Set (3pc) - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ganeshw/ Arch - 5 inch',
  default_price = 2000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ganeshw/ Arch - 5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi w/Arch - 5 inch',
  default_price = 2000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi w/Arch - 5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Saraswathi w/Arch - 5 inch',
  default_price = 2000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Saraswathi w/Arch - 5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Annapoorani - 4 inch',
  default_price = 1000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Annapoorani - 4 inch - ₹1000%';

UPDATE subcategories SET 
  subcategory_name = 'Garudan - 4 inch',
  default_price = 800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Garudan - 4 inch - ₹800%';

UPDATE subcategories SET 
  subcategory_name = 'Dhanvantri - 4inch',
  default_price = 1000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Dhanvantri - 4inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ganesh - 1.5 inch (₹350)',
  default_price = 350
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ganesh - 1.5 inch (₹350) - ₹350%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Ganesh - 1.5 inch (₹350)',
  default_price = 350
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Ganesh - 1.5 inch (₹350) - ₹350%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Narayanan - 1.5 inch (₹350)',
  default_price = 350
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Narayanan - 1.5 inch (₹350) - ₹350%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Narayanan - 1.5 inch (₹600)',
  default_price = 600
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Narayanan - 1.5 inch (₹600) - ₹600%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi Ganesh - 1.5 inch (₹600)',
  default_price = 600
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi Ganesh - 1.5 inch (₹600) - ₹600%';

UPDATE subcategories SET 
  subcategory_name = 'Ganesh - 4 inch',
  default_price = 1600
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ganesh - 4 inch - ₹1600%';

UPDATE subcategories SET 
  subcategory_name = 'Lakshmi - 4 inch',
  default_price = 1600
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Lakshmi - 4 inch - ₹1600%';

UPDATE subcategories SET 
  subcategory_name = 'Saraswathi - 4 inch',
  default_price = 1600
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Saraswathi - 4 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Rishabadevar - 6 inch',
  default_price = 1200
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Rishabadevar - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Murugan - 5.5 inch',
  default_price = 2000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Murugan - 5.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Krishana - 7.5 inch',
  default_price = 2100
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Krishana - 7.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Adi Sangarar - 3 inch',
  default_price = 1700
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Adi Sangarar - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Meenakshi - 6 inch',
  default_price = 1800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Meenakshi - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Hanuman - 5.5 inch',
  default_price = 1800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Hanuman - 5.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Panchamuga Hanuman - 6 inch',
  default_price = 4000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Panchamuga Hanuman - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Shiva Parvathi - 5 inch',
  default_price = 1700
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Shiva Parvathi - 5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ganesh (Gold Polish) - 1.5 inch',
  default_price = 550
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ganesh (Gold Polish) - 1.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Parvathi - 5 inch',
  default_price = 1000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Parvathi - 5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ramar Pattabhishekam - 6 inch',
  default_price = 7000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ramar Pattabhishekam - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ram Lalla Ayodha - 6 inch',
  default_price = 3500
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ram Lalla Ayodha - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Somaskandar - 6 inch',
  default_price = 6000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Somaskandar - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Murugan - 4 inch',
  default_price = 1600
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Murugan - 4 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Perumal - 6 inch',
  default_price = 1900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Perumal - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Garudan - 6 inch',
  default_price = 1800
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Garudan - 6 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Thiruvanaikaval Ganesh - 3.5 inch',
  default_price = 1000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Thiruvanaikaval Ganesh - 3.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Sitting Hanuman - 3.5 inch',
  default_price = 1100
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Sitting Hanuman - 3.5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Sivalingam Chola Style - 2.5"',
  default_price = 1900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Sivalingam Chola Style - 2.5"%';

UPDATE subcategories SET 
  subcategory_name = 'Kamadenu - 2 inch',
  default_price = 500
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Kamadenu - 2 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Kamakshi - 3 inch',
  default_price = 950
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Kamakshi - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Nandhi Big - 2 inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Nandhi Big - 2 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Vel with Stand - 4 inch',
  default_price = 500
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Vel with Stand - 4 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Annamalayar - 3 inch',
  default_price = 1500
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Annamalayar - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Nataraja - 8 inch',
  default_price = 7000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Nataraja - 8 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Murugan Set - 5 inch',
  default_price = 4000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Murugan Set - 5 inch%';

UPDATE subcategories SET 
  subcategory_name = 'BalaMurugan - 4inch',
  default_price = 1400
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'BalaMurugan - 4inch%';

UPDATE subcategories SET 
  subcategory_name = 'Yoga Narashimmar - 4inch',
  default_price = 2000
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Yoga Narashimmar - 4inch%';

UPDATE subcategories SET 
  subcategory_name = 'Ramanujar - 3inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Ramanujar - 3inch - ₹900%';

UPDATE subcategories SET 
  subcategory_name = 'Manavala Mamunigal w/ snake - 3 inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Manavala Mamunigal w/ snake - 3 inch%';

UPDATE subcategories SET 
  subcategory_name = 'Nammalvar - 3inch',
  default_price = 900
WHERE category_id = 'da9e71ad-c1b7-49a6-926f-3cf44c5a1166' AND subcategory_name LIKE 'Nammalvar - 3inch%';
