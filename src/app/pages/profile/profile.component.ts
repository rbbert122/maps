import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FirebaseService,
  IDatabaseItem,
} from '../../services/firebase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  isConnected: boolean = false;
  subscriptionList: Subscription = new Subscription();
  subscriptionObj: Subscription = new Subscription();

  listItems: IDatabaseItem[] = [];

  constructor(private fbs: FirebaseService) {}

  ngOnInit() {}

  connectFirebase() {
    if (this.isConnected) {
      return;
    }
    this.isConnected = true;
    this.fbs.connectToDatabase();
    this.subscriptionList = this.fbs
      .getChangeFeedList()
      .subscribe((items: IDatabaseItem[]) => {
        console.log('list updated: ', items);
        this.listItems = items;
      });
    this.subscriptionObj = this.fbs
      .getChangeFeedObject()
      .subscribe((stat: IDatabaseItem) => {
        console.log('object updated: ', stat);
      });
  }

  addListItem() {
    const uid = localStorage.getItem('uid');
    if (uid) {
      let newItemValue: string = Math.floor(Math.random() * 100).toString();
      this.fbs.addListObject(newItemValue, uid);
    }
  }

  removeItems() {
    this.fbs.removeListItems();
  }

  disconnectFirebase() {
    if (this.subscriptionList != null) {
      this.subscriptionList.unsubscribe();
    }
    if (this.subscriptionObj != null) {
      this.subscriptionObj.unsubscribe();
    }
  }

  ngOnDestroy(): void {
    this.disconnectFirebase();
  }
}
