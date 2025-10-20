import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';

interface Exam {
  code: string;
  version: string;
  subjectId: string;
  title: string;
  course: string;
  lec: string;
  oe: number;
  dept: string;
  day: string;
  time: string;
  room: string;
  instructor: string;
}

@Component({
  selector: 'app-conflict',
  templateUrl: './conflict.component.html',
  styleUrls: ['./conflict.component.scss']
})
export class ConflictComponent implements OnInit {

  exams: Exam[] = [];
  generatedSchedule: any[] = [];

  rooms = Array.from({ length: 81 }, (_, i) => `Room ${i + 1}`);
  days = ['Day 1', 'Day 2', 'Day 3'];
  timeSlots: string[] = [
    '7:30-9:00',
    '9:00-10:30',
    '10:30-12:00',
    '12:00-1:30',
    '1:30-3:00',
    '3:00-4:30',
    '4:30-6:00',
    '6:00-7:30'
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {}


  loadExams() {
    this.api.getExams().subscribe({
      next: (res) => {
        // The file structure has { message, data: [...] }
        this.exams = res.data.map(item => ({
          code: item.codeNo,
          version: item.version,
          subjectId: item.subjectId,
          title: item.subjectTitle,
          course: item.course,
          lec: item.lecUnits,
          oe: item.oe,
          dept: item.dept,
          day: item.day,
          time: item.time,
          room: item.roomNumber,
          instructor: item.instructor
        }));

        console.log('Imported Exams:', this.exams);
      },
      error: (err) => {
        console.error('Error loading exams:', err);
      }
    });
  }

  generateExamSchedule() {
  const schedule: any[] = [];
  let dayIndex = 0;
  let timeIndex = 0;
  let roomIndex = 0;

  const usedSlots: any = {};

  for (const exam of this.exams) {
    // assign current slot
    const scheduleItem = {
      subject: exam.title,
      course: exam.course,
      room: this.rooms[roomIndex],
      day: this.days[dayIndex],
      time: this.timeSlots[timeIndex]
    };

    schedule.push(scheduleItem);

    // move to next slot
    roomIndex++;
    if (roomIndex >= this.rooms.length) {
      roomIndex = 0;
      timeIndex++;
    }

    if (timeIndex >= this.timeSlots.length) {
      timeIndex = 0;
      dayIndex++;
    }

    // Reset back to first day if all days used
    if (dayIndex >= this.days.length) {
      dayIndex = 0;
    }
  }

  this.generatedSchedule = schedule;
  console.log('Generated Exam Schedule:', this.generatedSchedule);
}
}
