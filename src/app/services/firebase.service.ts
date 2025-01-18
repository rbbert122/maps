import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';

export interface IDatabaseItem {
  name: string;
  val?: string;
  uid?: string;
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

  addListObject(val: string, uid: string) {
    let item: IDatabaseItem = {
      name: 'test',
      val: val,
      uid: uid,
    };
    this.db.list('list').push(item);
  }

  updateObject(val: string) {
    let item: IDatabaseItem = {
      name: 'test',
      val: val,
    };
    this.db.object('obj').set([item]);
  }
}
