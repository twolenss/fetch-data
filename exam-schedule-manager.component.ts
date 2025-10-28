import { Component, OnInit } from '@angular/core';
import { ApiService } from './../../../api.service';
import { GlobalService } from './../../../global.service';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { SubjectGroup } from '../../../subject-code';
import { DepartmentGroup } from '../../../subject-code';
import { Room } from '../../../subject-code';

@Component({
  selector: 'app-exam-schedule-manager',
  templateUrl: './exam-schedule-manager.component.html',
  styleUrls: ['./exam-schedule-manager.component.scss']
})
export class ExamScheduleManagerComponent implements OnInit {

  codes: any[] = [];
  subjectId;
  loadingDept;
  activeTerm;
  startDate: Date | null = null;
  generatedDates: string[] = [];
  timeSlots: string[] = [
    '7:30 AM-9:00 AM', '9:00 AM-10:30 AM', '10:30 AM-12:00 PM', '12:00 PM-1:30 PM',
    '1:30 PM-3:00 PM', '3:00 PM-4:30 PM', '4:30 PM-6:00 PM', '6:00 PM-7:30 PM'
  ];
  termOptions = [
    { key: 1, value: '1st Term' },
    { key: 2, value: '2nd Term' },
    { key: 3, value: 'Summer' },
  ];
  combinedOptions: { label: string, value: string }[] = [];
  generatedSchedule: any[] = [];
  departments: DepartmentGroup[] = [];
  swal = Swal;
  constructor(public api: ApiService, public global: GlobalService) {}

  ngOnInit() {
    this.combineYearTerm();
  }

  // DATE GENERATION
  date() {
    const dayCount = 3;
    const currentDate = new Date(this.startDate);
    this.generatedDates = [];

    for (let i = 0; i < dayCount; i++) {
      this.generatedDates.push(currentDate.toDateString());
      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log("Generated Dates:", this.generatedDates);
  }

  // DYNAMIC YEAR-TERM COMBINATION
  combineYearTerm() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      const nextYear = y + 1;
      for (const t of this.termOptions) {
        const label = `${t.value} ${y}-${nextYear}`;
        const value = `${y}${nextYear.toString().slice(-2)}${t.key}`;
        this.combinedOptions.push({ label, value });
      }
    }
  }
  
  // FETCH CODE SUMMARY REPORT
  getCodeSummaryReport(sy) {
    this.api.getCodeSummaryReport(sy)
      .map(response => response.json())
      .subscribe(
        res => {
          console.log('Raw Codes:', res.data);
          setTimeout(() => {
            Swal.close();
            this.codes = this.getUniqueSubjectIds(res.data);
            console.log('Processed Codes:', this.codes);
          });
        },
        Error => {
          this.global.swalAlertError(Error);
        }
      );
       this.date();
  }

  // SweetAlert Loading
  loadSwal() {
    this.swal.fire({
      title: 'Loading',
      text: '',
      type: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      onOpen: () => {
        Swal.showLoading();
      }
    });
  }

  // SELECTED TERM & YEAR
  selectTermYear() {
    if (!this.activeTerm) {
      this.global.swalAlertError("Please select term");
      return;
    }
    this.loadSwal();
    this.getCodeSummaryReport(this.activeTerm);
    console.log('Selected term-year value:', this.activeTerm);
  }

  // UNIQUE SUBJECT IDS
  getUniqueSubjectIds(data: any[]): SubjectGroup[] {
    const groupedID: SubjectGroup[] = [];
      data.forEach(item => {
      const existing = groupedID.find(s => s.subjectId === item.subjectId);

      if (existing) {
        existing.codes.push({
          codeNo: item.codeNo,
          course: item.course,
          year: item.yearLevel,
          dept: item.dept

        });
      } else {
        groupedID.push({
          subjectId: item.subjectId,
          subjectTitle: item.subjectTitle,
          codes: [{
            codeNo: item.codeNo,
            course: item.course,
            year: item.yearLevel,
            dept: item.dept
          }]
        });
      }
    });
    return groupedID;
  }

  getRooms(){
    const rooms: Room[] = []
    data

  }

  // GREEDY SCHEDULER FUNCTION
  generateSchedule() {
    if (this.codes.length === 0) {
      this.global.swalAlertError("No subjects to schedule.");
      return;
    }
    const days = [1, 2, 3];
    const usedSlots = new Set();
    let currentDayIndex = 0;
    let currentTimeIndex = 0;

    this.generatedSchedule = [];

    for (const subject of this.codes) {
      const day = days[currentDayIndex];
      const time = this.timeSlots[currentTimeIndex];
      const slotKey = `${day}-${time}`;

      if (!usedSlots.has(slotKey)) {
        this.generatedSchedule.push({
          subjectId: subject.subjectId,
          title: subject.subjectTitle,
          day,
          time,
          codes: subject.codes,
        });
        usedSlots.add(slotKey);
      }

      // Move to next slot
      currentTimeIndex++;
      if (currentTimeIndex >= this.timeSlots.length) {
        currentTimeIndex = 0;
        currentDayIndex++;
        if (currentDayIndex >= days.length) {
          currentDayIndex = 0; 
        }
      }
    }
    console.log("Generated Schedule:", this.generatedSchedule);
    this.global.swalSuccess("Schedule generated successfully!");
  }
}
