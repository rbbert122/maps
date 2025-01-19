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
    const paceMetersPerSecond = distance / duration;
    const MET = 1.0 + 0.2 * paceMetersPerSecond + 0.9 * Math.pow(paceMetersPerSecond, 2); // calories burnt updated formula
  
    const weightKg = 70; 
    const durationHours = duration / 3600;
  
    const caloriesBurned = parseFloat(
      (MET * weightKg * durationHours).toFixed(2)
    );

    let item: IDatabaseItem = {
      uid: uid,
      distance: parseFloat(distance.toFixed(2)),
      date: new Date().toLocaleString(),
      calories: caloriesBurned,
      duration: parseFloat(duration.toFixed(2)),
    };

    this.db.list('list').push(item);
  }
}
