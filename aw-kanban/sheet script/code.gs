// ***
// google form (prod) https://forms.gle/m5bMrXF76qwrD9wKA
// ***

/*<*/
function set_ScriptProperties() {
  //PropertiesService.getScriptProperties().setProperty('DESTINATION_FILEID', '1GEmrEzF0hZzpxgkdM6oqSyAAsEsilEJd-ew7Z8ryFoY');
  //PropertiesService.getScriptProperties().setProperty('HUMANRANGER_FILEID', '1BssKWVvYImZft0zo9jJqxhI2oeJUA4tEPjGh7EzE8IE');
}
/*>*/

// 1. ตั้งค่าไฟล์ปลายทาง (Production)
const DESTINATION_FILEID = PropertiesService.getScriptProperties().getProperty('DESTINATION_FILEID');
const HUMANRANGER_FILEID = PropertiesService.getScriptProperties().getProperty('HUMANRANGER_FILEID');

var destSpreadsheet = SpreadsheetApp.openById(DESTINATION_FILEID);

/**
 * ฟังก์ชันทดสอบ: จัดรูปแบบวันที่ และ ดึงเลขแถวล่าสุดมา +1
 */
function appendRowToJobList() {
  try {
    var destinationSheetName = "Job Line 2026"; 
    var sourceSheetName = "Form responses"; 
    
    // 2. ดึงข้อมูลจาก Sheet ต้นทาง (Response Sheet) แถวสุดท้าย
    var sourceSheet = destSpreadsheet.getSheetByName(sourceSheetName);
    var lastRowSource = sourceSheet.getLastRow();
    
    if (lastRowSource < 2) {
      SpreadsheetApp.getUi().alert("ไม่พบข้อมูลใน Sheet ต้นทาง");
      return;
    }
    
    var rowData = sourceSheet.getRange(lastRowSource, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

    // --- ส่วนที่ 1: จัดรูปแบบ วัน เดือน ปี ---
    // สมมติ Timestamp อยู่คอลัมน์ A (index 0)
    var timestamp = new Date(rowData[0]); 
    var submittedDate = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd/MM/yyyy");

    var requester_email = rowData[1];
    var isduplicated = checkDuplicated(timestamp, requester_email)

    if (isduplicated === 1) {
      console.log("Existing record found");
      return;
    } else {
        //console.log(timestamp + " .. " + requester_email);
    }
    
    // --- ส่วนที่ 2: ดึงเลขจากคอลัมน์ B ของไฟล์เป้าหมายมา +1 ---
    var destSheet = destSpreadsheet.getSheetByName(destinationSheetName);
    var lastRowDest = destSheet.getLastRow();
    
    var newNumber = 1; // ค่าเริ่มต้นหากยังไม่มีข้อมูล
    if (lastRowDest >= 1) {
      // ดึงค่าจากแถวสุดท้าย คอลัมน์ C (คอลัมน์ที่ 3)
      var lastValue = destSheet.getRange(lastRowDest, 3).getValue();
      
      // ตรวจสอบว่าเป็นตัวเลขหรือไม่ ถ้าใช่ให้ +1
      if (!isNaN(lastValue) && lastValue !== "") {
        newNumber = Number(lastValue) + 1;
      }
    }

    // สมมติ rowData[11] คือคอลัมน์ที่มีทั้งคำอธิบายและลิงก์ปนกัน
    var rawText = rowData[12]; 

    // ใช้ Regular Expression เพื่อแยก Link และ Text
    var urlRegex = /https?:\/\/[^\s]+/;
    var extractLink = rawText.match(urlRegex) ? rawText.match(urlRegex)[0] : ""; // ดึงลิงก์แรกที่เจอ
    var extractDesc = rawText.replace(urlRegex, "").trim(); // ตัดลิงก์ออกให้เหลือแต่คำอธิบาย
    var jobname = rowData[2];

    var expectedDateTime = Utilities.formatDate(new Date(rowData[6]), Session.getScriptTimeZone(), "dd/MM/yyyy");  
    if (expectedDateTime < submittedDate) {
      expectedDateTime = submittedDate;
    }

    var jobtype = rowData[7];
    var jobformat = rowData[9];
    var job_quantity = rowData[11];
    var requested_by = rowData[3];
    var department = rowData[4];
    var file_link = rowData[13]; //column N
    var job_priority = rowData[14]; //column O
    var return_workhour = getWorkHours(jobtype, jobformat, job_quantity);
    var estimated_workhours = return_workhour.return_workhour;
    var committed_qty = return_workhour.return_qty;
    
    let draft_due_date = new Date(0);    
    if (estimated_workhours > 0) {
      draft_due_date = find_NextJob_FinishTime(submittedDate, estimated_workhours);
    }
    draft_due_date = Utilities.formatDate(draft_due_date, Session.getScriptTimeZone(), "dd/MM/yyyy");

    // --- ส่วนที่ 3: จัดชุดข้อมูลเตรียมส่ง ---
    // คอลัมน์ A: วันที่ | คอลัมน์ B: เลขที่รันใหม่ | คอลัมน์ C: ข้อมูลอื่นๆ
    var dataToAppend = [
      timestamp,                  //01  timestamp
      "new",                      //02  status
      newNumber,                  //03  เลขที่บวกเพิ่มแล้ว
      jobname,                    //04  Project name
      jobtype,                    //05  type
      jobformat,                  //06  format
      job_quantity,               //07  quantity
      requested_by,               //08  requested by
      department,                 //09  department
      submittedDate,              //10  request submit date
      "",                         //11  brief appointment date
      "",                         //12  brief complete date
      expectedDateTime,           //13  expected date
      committed_qty,              //14  committed quantity
      estimated_workhours,        //15  estimated workhours
      draft_due_date,             //16  estimated due date
      "PM",                       //17  estimated AMPM
      "",                         //18  revised due date
      "PM",                       //19  revised AMPM
      "",                         //20  final due date
      "PM",                       //21  final AMPM
      "",                         //22  MBO
      "",                         //23  Job deliver วันส่งงาน
      file_link,                  //24  Link
      "",                         //25  remark
      job_priority,               //26  priority
      requester_email,            //27  requester email
      extractDesc,                //28  คำอธิบายจากผู้ของาน
      extractLink,                //29  ลิงค์งานอ้างอิงจากผู้ของาน
      "sasitorn@thanatkorn.com",  //30  ผู้รับมอบหมายงาน
      "",                         //31  วันเริ่มทำงาน
      "",                         //32  วันเสร็จงาน
      "",                         //33  คำอธิบายความคืบหน้าของงาน
      "",                         //34  OutputLink_File1
      "",                         //35  OutputLink_File2
      "",                         //36  OutputLink_File3
      "",                         //37  OutputLink_File4
      ""                          //38  OutputLink_File5
    ];

    // 5. บันทึกลงไฟล์ปลายทาง
    destSheet.appendRow(dataToAppend);
    
    //Logger.log("สำเร็จ! วันที่: " + submittedDate + " เลขลำดับใหม่: " + newNumber);
    //SpreadsheetApp.getUi().alert("บันทึกสำเร็จ!\nวันที่: " + submittedDate + "\nลำดับที่: " + newNumber);

  } catch (err) {
    Logger.log("Error: " + err.message);
    //SpreadsheetApp.getUi().alert("เกิดข้อผิดพลาด: " + err.message);
  }
}


function getWorkHours(jobType, jobformat, quantity) {
  var sheet_workhourName = "LeadTime"; 
  var sheet_workhour = destSpreadsheet.getSheetByName(sheet_workhourName);

  if (!sheet_workhour) return "Error: Sheet " & sheet_workhourName & " not found";

  const data = sheet_workhour.getDataRange().getValues();
  const dayhour = 8;
  var estimated_workhour = 0;
  var committed_qty = 0;

  for (let i = 1; i < data.length; i++) {
    let rowJobtype    = data[i][1];       //column B
    let rowJobformat  = data[i][2];       //column C
    let rowQty        = data[i][3];       //column D
    let rowWorkHours  = data[i][4];       //column E

    if (rowJobtype === jobType && rowJobformat === jobformat) {
      if (quantity >= rowQty) {
        estimated_workhour = rowWorkHours * dayhour;
        committed_qty = rowQty;
      }     
      if (rowQty === quantity) {
        return {
          return_workhour: estimated_workhour,
          return_qty: committed_qty
        };
      }
    }
  }

  return {
    return_workhour: estimated_workhour,
    return_qty: committed_qty
  };
}

/**
 * คำนวณวันส่งงานที่คาดการณ์ของงานใหม่
 *
 * Logic ใหม่:
 *  1. หา "จุดอ้างอิง" (referenceDate) = วันที่ล่าสุดในบรรดา:
 *       - completed_date ล่าสุด (งานที่ done/complete/finish) → ใช้เป็นฐานว่างานเสร็จถึงจุดไหนแล้ว
 *       - final_due_date ของทุกงานที่ยัง active (ไม่ใช่ done) → สะท้อนภาระงานค้างอยู่
 *     ถ้าไม่มีข้อมูลใดเลย ใช้ "วันนี้" เป็นจุดเริ่มต้น
 *
 *  2. นับจาก referenceDate บวก estimated workhour ของงานใหม่
 *     (ข้ามวันหยุดและวันเสาร์-อาทิตย์)
 *
 * @param {number} workhours  ชั่วโมงงานโดยประมาณของงานชิ้นใหม่
 * @return {Date}             วันที่คาดว่าจะแล้วเสร็จ
 */
function find_NextJob_FinishTime(submittedDate, workhours) {
  const sheet_JobList = destSpreadsheet.getSheetByName("Job Line 2026");
  const data = sheet_JobList.getDataRange().getValues();
  const holidayList = getOfficeHolidays();
  const completedStatus = ["done", "complete", "finish"];

  let latestCompletedDate  = new Date(0);
  let latestActiveFinalDate = new Date(0);
  let workhour_waiting = 0;

  for (let i = 1; i < data.length; i++) {
    const rowStatus = (data[i][1] || "").toString().toLowerCase().trim();

    if (completedStatus.includes(rowStatus)) {
      const raw = data[i][30];
      const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      if (d && !isNaN(d.getTime()) && d > latestCompletedDate) {
        latestCompletedDate = d;
      }
    } else {
      const raw = data[i][19];
      const d = raw instanceof Date ? raw : raw ? new Date(raw) : null;
      if (d && !isNaN(d.getTime()) && d > latestActiveFinalDate) {
        latestActiveFinalDate = d;
      }
      // Bug 2 fix: guard against blank/NaN cells
      workhour_waiting += Number(data[i][14]) || 0;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let referenceDate;
  if (latestCompletedDate.getTime() === 0 && latestActiveFinalDate.getTime() === 0) {
    referenceDate = new Date(today);
  } else {
    referenceDate = new Date(Math.max(
      submittedDate instanceof Date ? submittedDate.getTime() : 0,
      latestCompletedDate.getTime(),
      latestActiveFinalDate.getTime()
    ));
  }

  // Bug 1 fix: Math.ceil so workdays is always a whole number
  let workdays = Math.ceil((workhour_waiting + workhours) / 8);

  // Safety cap — never loop more than 365 days
  const MAX_DAYS = 365;
  let safety = 0;

  let resultDate = new Date(referenceDate);
  resultDate.setHours(0, 0, 0, 0);

  while (workdays > 0 && safety < MAX_DAYS) {
    resultDate.setDate(resultDate.getDate() + 1);
    safety++;
    if (!isNonWorkingDay(resultDate, holidayList)) {
      workdays--;
    }
  }

  if (safety >= MAX_DAYS) {
    console.warn("find_NextJob_FinishTime: hit safety cap — check holiday list or input data");
  }

  console.log("กำหนดวันส่งงาน: " + resultDate + " (safety=" + safety + ")");
  return resultDate;
}

function checkDuplicated(newTimestamp, newEmail) {
  var sheetname_JobList = "Job Line 2026"; 
  var sheet_JobList = destSpreadsheet.getSheetByName(sheetname_JobList);

  const data = sheet_JobList.getDataRange().getValues();
  
  // แปลงค่า Timestamp ที่รับมาให้เป็นรูปแบบที่เทียบกันได้ (เช่น String หรือ Time)
  const formattedNewTimestamp = new Date(newTimestamp).getTime();
  const formattedNewEmail = newEmail.toString().trim().toLowerCase();

  // 1. ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
  // สมมติ Timestamp อยู่ Column A (index 0) และ Email อยู่ Column B (index 1)
  const isDuplicate = data.some(row => {
    const rowTimestamp = new Date(row[0]).getTime();
    const rowEmail = row[26].toString().trim().toLowerCase();

    return rowTimestamp === formattedNewTimestamp && rowEmail === formattedNewEmail;

  });

  // 2. ถ้าซ้ำให้หยุดทำงาน
  if (isDuplicate) {
    //Logger.log("ข้อมูลซ้ำ!");
    return 1; 
  }

  // 3. ถ้าไม่ซ้ำ คืนค่า 0
  return 0;
}


/**
 * Gets an array of future holiday dates where Office == 0.
 * @return {number[]} An array of timestamps for easy comparison.
 */
function getOfficeHolidays() {
  // 2. อ่านค่าวันหยุดจากชีต calendar (Production)
  var HumanRanger_File = SpreadsheetApp.openById(HUMANRANGER_FILEID);
  const calendar_Sheetname = HumanRanger_File.getSheetByName("Calendar");
  const data = calendar_Sheetname.getDataRange().getValues();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

  let holidayList = [];

  // Assuming Column A = Date, Column B = Office
  for (let i = 1; i < data.length; i++) {
    let rowDate = new Date(data[i][0]);
    let officeStatus = data[i][4]; //This is real column
    //let officeStatus = data[i][8]; //This is test column

    // Check if date is today/future AND Office is 0
    if (rowDate >= today && officeStatus === 0) {
      // Store as timestamp (number) for much faster comparison later
      holidayList.push(rowDate.getTime());
    }
  }
  //var listcount = holidayList.length;
  //console.log("listcount " + listcount);
  return holidayList;
}

/**
 * Checks if a given date is a holiday or a weekend.
 */
function isNonWorkingDay(date, holidayList) {
  const day = date.getDay();
  const isWeekend = (day === 6 || day === 0);
  
  // Check if the date's timestamp exists in our holiday array
  const isHoliday = holidayList.includes(date.getTime());
  
  return isWeekend || isHoliday;
}


// 1. Authentication Check
function checkUserAccess() {
  const userEmail = Session.getActiveUser().getEmail();
  const authSheet = SpreadsheetApp.openById(HUMANRANGER_FILEID).getSheetByName("staffname"); // Create this sheet
  const users = authSheet.getRange("O:O").getValues().flat();
  return users.includes(userEmail);
}

