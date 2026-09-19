/**
 * Thai Address Cascading Dropdown Helper
 * Provides seamless 1-click selection of Province, District, Subdistrict & Zipcode
 */

(function () {
  const THAI_ADDRESS_DATA = {
    "กรุงเทพมหานคร": {
      "เขตวัฒนา": {
        "คลองเตยเหนือ": "10110",
        "คลองตันเหนือ": "10110",
        "พระโขนงเหนือ": "10110"
      },
      "เขตคลองเตย": {
        "คลองเตย": "10110",
        "คลองตัน": "10110",
        "พระโขนง": "10110"
      },
      "เขตปทุมวัน": {
        "รองเมือง": "10330",
        "วังใหม่": "10330",
        "ปทุมวัน": "10330",
        "ลุมพินี": "10330"
      },
      "เขตบางรัก": {
        "มหาพฤฒาราม": "10500",
        "สีลม": "10500",
        "สุริยวาศน์": "10500",
        "บางรัก": "10500",
        "สี่พระยา": "10500"
      },
      "เขตสาทร": {
        "ทุ่งมหาเมฆ": "10120",
        "ยานนาวา": "10120",
        "ทุ่งวัดดอน": "10120"
      },
      "เขตจตุจักร": {
        "ลาดยาว": "10900",
        "เสนานิคม": "10900",
        "จันทรเกษม": "10900",
        "จอมพล": "10900",
        "จตุจักร": "10900"
      },
      "เขตบางนา": {
        "บางนาเหนือ": "10260",
        "บางนาใต้": "10260"
      },
      "เขตพญาไท": {
        "สามเสนใน": "10400",
        "พญาไท": "10400"
      },
      "เขตดินแดง": {
        "ดินแดง": "10400",
        "รัชดาภิเษก": "10400"
      },
      "เขตห้วยขวาง": {
        "ห้วยขวาง": "10310",
        "บางกะปิ": "10310",
        "สามเสนนอก": "10310"
      },
      "เขตบางกะปิ": {
        "คลองจั่น": "10240",
        "หัวหมาก": "10240"
      },
      "เขตประเวศ": {
        "ประเวศ": "10250",
        "หนองบอน": "10250",
        "ดอกไม้": "10250"
      },
      "เขตพระโขนง": {
        "บางจาก": "10260"
      },
      "เขตธนบุรี": {
        "วัดกัลยาณ์": "10600",
        "หิรัญรูจี": "10600",
        "บางยี่เรือ": "10600",
        "บุคคโล": "10600",
        "ตลาดพลู": "10600",
        "ดาวคะนอง": "10600",
        "สำเหร่": "10600"
      },
      "เขตคลองสาน": {
        "สมเด็จเจ้าพระยา": "10600",
        "คลองสาน": "10600",
        "บางลำภูล่าง": "10600",
        "คลองต้นไทร": "10600"
      },
      "เขตบางแค": {
        "บางแค": "10160",
        "บางแคเหนือ": "10160",
        "บางไผ่": "10160",
        "หลักสอง": "10160"
      },
      "เขตบางกอกน้อย": {
        "ศิริราช": "10700",
        "บ้านช่างหล่อ": "10700",
        "บางขุนนนท์": "10700",
        "บางขุนศรี": "10700",
        "อรุณอมรินทร์": "10700"
      },
      "เขตบางกอกใหญ่": {
        "วัดอรุณ": "10600",
        "วัดท่าพระ": "10600"
      },
      "เขตสายไหม": {
        "สายไหม": "10220",
        "ออเงิน": "10220",
        "คลองถนน": "10220"
      },
      "เขตดอนเมือง": {
        "สีกัน": "10210",
        "ดอนเมือง": "10210",
        "สนามบิน": "10210"
      }
    },
    "นนทบุรี": {
      "เมืองนนทบุรี": {
        "สวนใหญ่": "11000",
        "ตลาดขวัญ": "11000",
        "บางเขน": "11000",
        "บางกระสอ": "11000",
        "ท่าทราย": "11000"
      },
      "ปากเกร็ด": {
        "ปากเกร็ด": "11120",
        "บางตลาด": "11120",
        "คลองเกลือ": "11120",
        "บางพูด": "11120"
      },
      "บางกรวย": {
        "บางกรวย": "11130",
        "บางสีทอง": "11130",
        "มหาสวัสดิ์": "11130"
      },
      "บางใหญ่": {
        "บางใหญ่": "11140",
        "เสาธงหิน": "11140",
        "บางแม่นาง": "11140"
      },
      "บางบัวทอง": {
        "บางบัวทอง": "11110",
        "โสนลอย": "11110",
        "พิมลราช": "11110"
      }
    },
    "สมุทรปราการ": {
      "เมืองสมุทรปราการ": {
        "ปากน้ำ": "10270",
        "สำโรงเหนือ": "10270",
        "บางเมือง": "10270",
        "ท้ายบ้าน": "10280"
      },
      "บางพลี": {
        "บางพลีใหญ่": "10540",
        "บางแก้ว": "10540",
        "ราชาเทวะ": "10540",
        "บางปลา": "10540"
      },
      "บางบ่อ": {
        "บางบ่อ": "10560",
        "คลองด่าน": "10550"
      },
      "พระประแดง": {
        "ตลาด": "10130",
        "บางพึ่ง": "10130",
        "บางจาก": "10130"
      }
    },
    "ปทุมธานี": {
      "เมืองปทุมธานี": {
        "บางปรอก": "12000",
        "บ้านใหม่": "12000",
        "บางกะดี": "12000"
      },
      "คลองหลวง": {
        "คลองหนึ่ง": "12120",
        "คลองสอง": "12120",
        "คลองสาม": "12120"
      },
      "ธัญบุรี": {
        "รังสิต": "12110",
        "ประชาธิปัตย์": "12130",
        "บึงยี่โถ": "12130"
      },
      "ลำลูกกา": {
        "คูคต": "12130",
        "ลาดสวาย": "12150",
        "บึงคำพร้อย": "12150"
      }
    },
    "ชลบุรี": {
      "เมืองชลบุรี": {
        "บางปลาสร้อย": "20000",
        "แสนสุข": "20130",
        "เสม็ด": "20000",
        "บ้านสวน": "20000"
      },
      "บางละมุง (พัทยา)": {
        "หนองปรือ": "20150",
        "นาเกลือ": "20150",
        "ห้วยใหญ่": "20150",
        "หนองปลาไหล": "20150"
      },
      "ศรีราชา": {
        "ศรีราชา": "20110",
        "สุรศักดิ์": "20110",
        "ทุ่งสุขลา": "20230",
        "บ่อวิน": "20230"
      }
    },
    "เชียงใหม่": {
      "เมืองเชียงใหม่": {
        "ศรีภูมิ": "50200",
        "พระสิงห์": "50200",
        "ช้างคลาน": "50100",
        "สุเทพ": "50200",
        "นิมมานเหมินท์": "50200"
      },
      "สันทราย": {
        "สันทรายน้อย": "50210",
        "สันทรายหลวง": "50210"
      },
      "หางดง": {
        "หางดง": "50230",
        "หนองควาย": "50230"
      },
      "แม่ริม": {
        "ริมใต้": "50180",
        "แม่แรม": "50180"
      }
    },
    "ภูเก็ต": {
      "เมืองภูเก็ต": {
        "ตลาดใหญ่": "83000",
        "ตลาดเหนือ": "83000",
        "เกาะแก้ว": "83000",
        "ราไวย์": "83130",
        "ฉลอง": "83130"
      },
      "กะทู้ (ป่าตอง)": {
        "ป่าตอง": "83150",
        "กะทู้": "83120",
        "กมลา": "83150"
      },
      "ถลาง": {
        "เทพกระษัตรี": "83110",
        "เชิงทะเล": "83110"
      }
    },
    "นครราชสีมา": {
      "เมืองนครราชสีมา": {
        "ในเมือง": "30000",
        "โพธิ์กลาง": "30000",
        "หนองจะบก": "30000",
        "หัวทะเล": "30000",
        "จอหอ": "30310"
      },
      "ปากช่อง (เขาใหญ่)": {
        "ปากช่อง": "30130",
        "หมูสี": "30130",
        "ขนงพระ": "30130"
      }
    },
    "ขอนแก่น": {
      "เมืองขอนแก่น": {
        "ในเมือง": "40000",
        "ศิลา": "40000",
        "บ้านเป็ด": "40000",
        "เมืองเก่า": "40000"
      },
      "ชุมแพ": {
        "ชุมแพ": "40130"
      }
    },
    "สงขลา": {
      "หาดใหญ่": {
        "หาดใหญ่": "90110",
        "คอหงส์": "90110",
        "คลองแห": "90110"
      },
      "เมืองสงขลา": {
        "บ่อยาง": "90000"
      }
    },
    "ระยอง": {
      "เมืองระยอง": {
        "ท่าประดู่": "21000",
        "เชิงเนิน": "21000",
        "เนินพระ": "21000",
        "มาบตาพุด": "21150"
      },
      "ปลวกแดง": {
        "ปลวกแดง": "21140",
        "มาบยางพร": "21140"
      }
    }
  };

  // Full 77 Provinces of Thailand in alphabetical order
  const ALL_PROVINCES = [
    "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
    "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
    "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง",
    "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม",
    "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส",
    "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
    "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา",
    "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์",
    "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
    "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง",
    "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย",
    "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
    "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี",
    "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
    "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์",
    "อุทัยธานี", "อุบลราชธานี"
  ];

  window.MinozaThaiAddress = {
    init: function (config) {
      const provinceEl = document.getElementById(config.provinceId || 'custProvince');
      const districtEl = document.getElementById(config.districtId || 'custDistrict');
      const subdistrictEl = document.getElementById(config.subdistrictId || 'custSubdistrict');
      const zipcodeEl = document.getElementById(config.zipcodeId || 'custZipcode');
      const streetEl = document.getElementById(config.streetId || 'custStreet');
      const fullAddressEl = document.getElementById(config.fullAddressId || 'custAddress');

      if (!provinceEl) return;

      const getPlaceholder = () => {
        return (window.MinozaI18n && window.MinozaI18n.currentLang === 'en') ? 'Please select' : 'โปรดระบุ';
      };

      // Populate Provinces
      provinceEl.innerHTML = `<option value="">${getPlaceholder()}</option>` +
        ALL_PROVINCES.map(p => `<option value="${p}">${p}</option>`).join('');

      // Province change handler
      provinceEl.addEventListener('change', () => {
        const prov = provinceEl.value;
        const data = THAI_ADDRESS_DATA[prov];

        districtEl.innerHTML = `<option value="">${getPlaceholder()}</option>`;
        subdistrictEl.innerHTML = `<option value="">${getPlaceholder()}</option>`;
        if (zipcodeEl) zipcodeEl.value = '';

        if (data) {
          Object.keys(data).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            districtEl.appendChild(opt);
          });
        } else if (prov) {
          // Allow manual district for other provinces
          const opt = document.createElement('option');
          opt.value = 'อำเภอเมือง';
          opt.textContent = 'อำเภอเมือง';
          districtEl.appendChild(opt);
          const opt2 = document.createElement('option');
          opt2.value = 'อำเภออื่นๆ (ระบุในช่องที่อยู่)';
          opt2.textContent = 'อำเภออื่นๆ (ระบุในช่องที่อยู่)';
          districtEl.appendChild(opt2);
        }
        this.updateCombinedAddress(streetEl, provinceEl, districtEl, subdistrictEl, zipcodeEl, fullAddressEl);
      });

      // District change handler
      districtEl.addEventListener('change', () => {
        const prov = provinceEl.value;
        const dist = districtEl.value;
        const data = THAI_ADDRESS_DATA[prov];

        subdistrictEl.innerHTML = `<option value="">${getPlaceholder()}</option>`;
        if (zipcodeEl) zipcodeEl.value = '';

        if (data && data[dist]) {
          const subs = data[dist];
          Object.keys(subs).forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            subdistrictEl.appendChild(opt);
          });
        }
        this.updateCombinedAddress(streetEl, provinceEl, districtEl, subdistrictEl, zipcodeEl, fullAddressEl);
      });

      // Subdistrict change handler
      subdistrictEl.addEventListener('change', () => {
        const prov = provinceEl.value;
        const dist = districtEl.value;
        const sub = subdistrictEl.value;
        const data = THAI_ADDRESS_DATA[prov];

        if (data && data[dist] && data[dist][sub] && zipcodeEl) {
          zipcodeEl.value = data[dist][sub];
        } else if (!sub && zipcodeEl) {
          zipcodeEl.value = '';
        }
        this.updateCombinedAddress(streetEl, provinceEl, districtEl, subdistrictEl, zipcodeEl, fullAddressEl);
      });

      if (zipcodeEl) {
        zipcodeEl.addEventListener('input', () => {
          this.updateCombinedAddress(streetEl, provinceEl, districtEl, subdistrictEl, zipcodeEl, fullAddressEl);
        });
      }

      if (streetEl) {
        streetEl.addEventListener('input', () => {
          this.updateCombinedAddress(streetEl, provinceEl, districtEl, subdistrictEl, zipcodeEl, fullAddressEl);
        });
      }
    },

    updateCombinedAddress: function (streetEl, provinceEl, districtEl, subdistrictEl, zipcodeEl, fullAddressEl) {
      if (!fullAddressEl) return;
      const street = (streetEl && streetEl.value) ? streetEl.value.trim() : '';
      const province = (provinceEl && provinceEl.value) ? provinceEl.value : '';
      const district = (districtEl && districtEl.value) ? districtEl.value : '';
      const subdistrict = (subdistrictEl && subdistrictEl.value) ? subdistrictEl.value : '';
      const zipcode = (zipcodeEl && zipcodeEl.value) ? zipcodeEl.value.trim() : '';

      const parts = [];
      if (street) parts.push(street);
      if (subdistrict && !subdistrict.includes('--')) parts.push(`ต./แขวง ${subdistrict}`);
      if (district && !district.includes('--')) parts.push(`อ./เขต ${district}`);
      if (province && !province.includes('--')) parts.push(`จ. ${province}`);
      if (zipcode) parts.push(zipcode);

      fullAddressEl.value = parts.join(' ');
    }
  };
})();
