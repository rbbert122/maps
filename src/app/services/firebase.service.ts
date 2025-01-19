import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';

export interface IDatabaseItem {
  uid?: string;
  distance?: number;
  date?: string;
  calories?: number;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  listFeed!: Observable<any[]>;
  objFeed!: Observable<any>;

  constructor(public db: AngularFireDatabase) {}

  connectToDatabase() {
    this.listFeed = this.db.list('list').valueChanges();
    this.objFeed = this.db.object('obj').valueChanges();
  }

  getChangeFeedList() {
    return this.listFeed;
  }

  getChangeFeedObject() {
    return this.objFeed;
  }

  removeListItems() {
    this.db.list('list').remove();
  }

  addListObject(uid: string, distance: number, duration: number) {
    const MET = 8;
    const weightKg = 70;
    const durationHours = duration / 3600;

    const caloriesBurned = MET * weightKg * durationHours;

    let item: IDatabaseItem = {
      uid: uid,
      distance: distance,
      date: new Date().toLocaleString(),
      calories: caloriesBurned,
      duration: duration,
    };
    this.db.list('list').push(item);
  }
}
