import { Component, OnInit } from '@angular/core';
import { ApiService } from './../../../api.service';
import { GlobalService } from './../../../global.service';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { SubjectGroup, DepartmentGroup, ProgramSchedule } from '../../../subject-code';

@Component({
  selector: 'app-exam-schedule-manager',
  templateUrl: './exam-schedule-manager.component.html',
  styleUrls: ['./exam-schedule-manager.component.scss']
})
export class ExamScheduleManagerComponent implements OnInit {

  rawCodes: any[] = [];
  codes: any[] = [];
  subjectId: string;
  programs: ProgramSchedule[] = [];
  activeTerm: string;
  startDate: Date | null = null;
  selectedDates: string[] = [];
  daysWithTimeSlots: { [day: string]: string[] } = {};
  selectedDate: Date | null = null;

  timeSlots: string[] = [
    '7:30 AM-9:00 AM', '9:00 AM-10:30 AM', '10:30 AM-12:00 PM', '12:00 PM-1:30 PM',
    '1:30 PM-3:00 PM', '3:00 PM-4:30 PM', '4:30 PM-6:00 PM', '6:00 PM-7:30 PM'
  ];
  displayedColumns: string[] = ['program', ...this.timeSlots];

  termOptions = [
    { key: 1, value: '1st Term' },
    { key: 2, value: '2nd Term' },
    { key: 3, value: 'Summer' },
  ];

  combinedOptions: { label: string, value: string }[] = [];
  departments: DepartmentGroup[] = [];
  swal = Swal;

  usedSubjectIds: Set<string> = new Set();

  selectedScheduleOutput: any[] = [];

  constructor(public api: ApiService, public global: GlobalService) {}

  ngOnInit() {
    this.combineYearTerm();
  }

  selectTermYear() {
  if (!this.activeTerm) {
    this.global.swalAlertError("Please select term");
      return;
  }
    this.loadSwal();
    this.getCodeSummaryReport(this.activeTerm);
    console.log('Selected term-year value:', this.activeTerm);
  }

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

  onDateSelect(event: any) {
    const selected = event.value.toLocaleDateString('en-CA') // yyyy-mm-dd
    if (!this.selectedDates.includes(selected)) {
      this.selectedDates.push(selected);
      this.daysWithTimeSlots[selected] = [...this.timeSlots]; // clone slots for this date
    }
  }

  removeDate(day: string) {
    this.selectedDates = this.selectedDates.filter(d => d !== day);
    delete this.daysWithTimeSlots[day];
  }

  getCodeSummaryReport(sy) {
    this.api.getCodeSummaryReport(sy)
      .map(response => response.json())
      .subscribe(
        res => {
          this.rawCodes = res.data;
          Swal.close();
          this.codes = this.getUniqueSubjectIds(res.data);
          this.programs = this.getUniquePrograms(res.data);
        },
        Error => {
          this.global.swalAlertError(Error);
        }
      );
  }

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

  getUniquePrograms(data: any[]): ProgramSchedule[] {
  const groupedProg: ProgramSchedule[] = [];
  data.forEach(item => {
    const existingProgram = groupedProg.find(p => p.program === item.course && p.year === item.yearLevel);

    const subjectData = {
      subjectId: item.subjectId,
      subjectTitle: item.subjectTitle,
      codeNo: item.codeNo
    };

    if (existingProgram) {
      const exists = existingProgram.subjects.find(s => s.subjectId === subjectData.subjectId);
      if (!exists) existingProgram.subjects.push(subjectData);
    } else {
      groupedProg.push({
        program: item.course,
        year: item.yearLevel,
        subjects: [subjectData],
        schedule: {},
        remainingSubjects: 0 // initialize
      });
    }
  });

  // Sort and initialize schedules
  groupedProg.sort((a, b) => a.program.localeCompare(b.program) || a.year - b.year);
  groupedProg.forEach(p => {
    this.timeSlots.forEach(slot => (p.schedule[slot] = ''));
    p.remainingSubjects = p.subjects.length; // set total subjects
  });

  console.log('Grouped Programs (Excel-style):', groupedProg);
  return groupedProg;
  }

  onSubjectSelect(prog: ProgramSchedule, slot: string, day: string) {
    const subjectId = prog.schedule[day + '_' + slot];
    if (!subjectId) return;

    const previousSubject = prog.schedule[day + '_' + slot];
    if (previousSubject && previousSubject !== subjectId) {
      this.usedSubjectIds.delete(previousSubject);
    }
    this.usedSubjectIds.add(subjectId);

    // Apply same subject to all programs for this specific date and slot
    this.programs.forEach(p => {
      const sameSubj = p.subjects.find(s => s.subjectId === subjectId);
      if (sameSubj) {
        p.schedule[day + '_' + slot] = subjectId;
      }
    });

    // Recalculate remaining subjects
    this.programs.forEach(p => {
      const scheduledIds = new Set(
        Object.values(p.schedule).filter(v => v)
      );
      p.remainingSubjects = p.subjects.length - scheduledIds.size;
    });

    // Build output grouped by date
    this.selectedScheduleOutput = this.selectedDates.map(day => ({
      date: day,
      programs: this.programs.map(p => ({
        program: p.program,
        year: p.year,
        subjects: Object.keys(p.schedule)
          .filter(key => key.startsWith(day + '_') && p.schedule[key])
          .map(key => {
            const subjId = p.schedule[key];
            const subj = p.subjects.find(s => s.subjectId === subjId);
            return {
              subjectId: subj ? subj.subjectId : '',
              subjectTitle: subj ? subj.subjectTitle : '',
              codeNo: subj ? subj.codeNo : '',
              sched: key.replace(day + '_', '')
            };
          })
      }))
    }));

    console.log("Updated Output:", this.selectedScheduleOutput);
  }

  saveSchedule() {
    console.log("Final Schedule Output:", this.selectedScheduleOutput);
    this.global.swalSuccess("Schedule saved successfully!");
  }
  
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
}
