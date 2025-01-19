import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import esri = __esri; // Esri TypeScript Types

import WebMap from '@arcgis/core/WebMap';
import Config from '@arcgis/core/config';
import MapView from '@arcgis/core/views/MapView';

import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';

import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import * as route from '@arcgis/core/rest/route.js';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import RouteParameters from '@arcgis/core/rest/support/RouteParameters';

import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as locator from '@arcgis/core/rest/locator.js';

import { MatSelectChange } from '@angular/material/select';

import { Subscription } from 'rxjs';
import {
  FirebaseService,
  IDatabaseItem,
} from '../../services/firebase.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  @ViewChild('mapViewNode', { static: true })
  private mapViewEl!: ElementRef;

  map!: esri.Map;
  view!: esri.MapView;
  graphicsLayer!: esri.GraphicsLayer;
  graphicsLayerUserPoints!: esri.GraphicsLayer;
  graphicsLayerRoutes!: esri.GraphicsLayer;
  graphicsLayerUserLocation!: esri.GraphicsLayer;
  runningTrailHeadsLayer!: esri.FeatureLayer;

  zoom = 12;
  center: Array<number> = [26.096306, 44.439663];
  basemap = 'streets-vector';
  loaded = false;
  directionsElement: any;

  trackingStartTime: number = 0;
  trackingActive = false;
  trackingInterval: any;
  trackedLocations: { lat: number; lng: number }[] = [];
  watchPositionId: number | null = null;
  lastKnownPosition: { lat: number; lng: number } | null = null;

  isConnected: boolean = false;
  subscriptionList: Subscription = new Subscription();
  subscriptionObj: Subscription = new Subscription();

  listItems: IDatabaseItem[] = [];

  // Place category dropdown
  places = ['Choose a place type...', 'Parks and Outdoors', 'Coffee shop'];
  selectedPlace: string = this.places[0];

  constructor(private fbs: FirebaseService) {}

  ngOnInit() {
    this.initializeMap().then(() => {
      this.loaded = this.view.ready;
      this.mapLoadedEvent.emit(true);
      this.connectFirebase();
      this.trackUserLocation();
    });
  }

  async initializeMap() {
    try {
      Config.apiKey =
        'AAPTxy8BH1VEsoebNVZXo8HurF30MVOzu-lK5LKmRBHShYE5QkBInPqMbbp3YFcDPGnH2D404e-ppLPm0lT3QaU8biIAeHmm6u0Rk2_FcJBjofjWz1mUxtYHdjj23pky6WMe5JtPral78HBvws2V9NiZyGwtXxND-pRHLP0xRdRtJdiNOX2LApyKUhxW_QADUy8l-B2BOCi9k9yBeTEDI2ewe813d-CntqJggwlgfshI-E0.AT1_OhxOjjcg';

      const mapProperties: esri.WebMapProperties = {
        basemap: this.basemap,
      };
      this.map = new WebMap(mapProperties);

      this.addFeatureLayers();
      this.addGraphicsLayer();

      const mapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this.center,
        zoom: this.zoom,
        map: this.map,
        popupEnabled: true,
      };
      this.view = new MapView(mapViewProperties);

      this.view.on('pointer-move', ['Shift'], (event) => {
        const point = this.view.toMap({ x: event.x, y: event.y });
        console.log('Map pointer moved: ', point.longitude, point.latitude);
      });

      await this.view.when();
      console.log('ArcGIS map loaded');
      this.addRouting();
      this.addPlaceSearch();
      console.log('Routing and place search added');
      return this.view;
    } catch (error) {
      console.error('Error loading the map: ', error);
      alert('Error loading the map');
      return null;
    }
  }

  addFeatureLayers() {
    this.runningTrailHeadsLayer = new FeatureLayer({
      url: 'https://services5.arcgis.com/gZloC1PiusdWdoOz/arcgis/rest/services/Trails/FeatureServer/1',
      outFields: ['*'],
      popupTemplate: {
        title: '{Name}',
        content: [
          {
            type: 'fields',
            fieldInfos: [
              {
                fieldName: 'Summary',
                label: 'Description',
              },
            ],
          },
        ],
      },
    });
    this.map.add(this.runningTrailHeadsLayer);

    const runningTrailsLayer = new FeatureLayer({
      url: 'https://services5.arcgis.com/gZloC1PiusdWdoOz/arcgis/rest/services/Trails/FeatureServer/0',
    });
    this.map.add(runningTrailsLayer, 0);

    console.log('Feature layers added');
  }

  addGraphicsLayer() {
    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);
    this.graphicsLayerUserPoints = new GraphicsLayer();
    this.map.add(this.graphicsLayerUserPoints);
    this.graphicsLayerRoutes = new GraphicsLayer();
    this.map.add(this.graphicsLayerRoutes);
    this.graphicsLayerUserLocation = new GraphicsLayer();
    this.map.add(this.graphicsLayerUserLocation);
  }

  addRouting() {
    const routeUrl =
      'https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World';

    this.view.on('click', (event) => {
      this.view.hitTest(event).then((elem: esri.HitTestResult) => {
        if (elem && elem.results && elem.results.length > 0) {
          const trailHeadResult = elem.results.find(
            (e) => e.layer === this.runningTrailHeadsLayer
          );

          if (trailHeadResult) {
            const point = trailHeadResult.mapPoint;
            const graphic = (trailHeadResult as esri.GraphicHit).graphic;

            // Show the popup at the clicked location
            this.view.popup.open({
              location: point,
              features: [graphic],
            });

            // Handle routing if needed
            if (this.graphicsLayerUserPoints.graphics.length === 0) {
              this.addPoint(point.latitude, point.longitude);

              if (this.lastKnownPosition) {
                this.addPoint(
                  this.lastKnownPosition.lat,
                  this.lastKnownPosition.lng
                );
                this.calculateRoute(routeUrl);
              } else {
                console.error('User location not yet available');
              }
            } else {
              this.removePoints();
              this.removeRoutes();
            }
          }
        }
      });
    });
  }

  removeRoutes() {
    this.graphicsLayerRoutes.removeAll();
  }

  addPoint(lat: number, lng: number) {
    console.log('Adding point: ', lat, lng);
    let point = new Point({
      longitude: lng,
      latitude: lat,
    });

    const simpleMarkerSymbol = {
      type: 'simple-marker',
      color: [226, 119, 40], // Orange
      outline: {
        color: [255, 255, 255], // White
        width: 1,
      },
    };

    let pointGraphic: esri.Graphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol,
    });

    this.graphicsLayerUserPoints.add(pointGraphic);
  }

  removePoints() {
    this.graphicsLayerUserPoints.removeAll();
  }

  async calculateRoute(routeUrl: string) {
    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: this.graphicsLayerUserPoints.graphics.toArray(),
      }),
      returnDirections: true,
    });
    console.log(
      'Route parameters: ',
      this.graphicsLayerUserPoints.graphics.toArray()
    );

    try {
      const data = await route.solve(routeUrl, routeParams);
      this.displayRoute(data);
    } catch (error) {
      console.error('Error calculating route: ', error);
      alert('Error calculating route');
    }
  }

  displayRoute(data: any) {
    for (const result of data.routeResults) {
      result.route.symbol = {
        type: 'simple-line',
        color: [5, 150, 255],
        width: 3,
      };
      this.graphicsLayerRoutes.graphics.add(result.route);
    }
    if (data.routeResults.length > 0) {
      this.showDirections(data.routeResults[0].directions.features);
    } else {
      alert('No directions found');
    }
  }

  clearRouter() {
    if (this.view) {
      // Remove all graphics related to routes
      this.removeRoutes();
      this.removePoints();
      console.log('Route cleared');
      this.view.ui.remove(this.directionsElement);
      this.view.ui.empty('top-right');
      console.log('Directions cleared');
    }
  }

  showDirections(features: any[]) {
    this.directionsElement = document.createElement('ol');
    this.directionsElement.classList.add(
      'esri-widget',
      'esri-widget--panel',
      'esri-directions__scroller'
    );
    this.directionsElement.style.marginTop = '0';
    this.directionsElement.style.padding = '15px 15px 15px 30px';

    features.forEach((result, i) => {
      const direction = document.createElement('li');
      direction.innerHTML = `${result.attributes.text} (${result.attributes.length} miles)`;
      this.directionsElement.appendChild(direction);
    });

    this.view.ui.empty('top-right');
    this.view.ui.add(this.directionsElement, 'top-right');
  }

  addPlaceSearch() {
    reactiveUtils.when(
      () => this.view.stationary,
      () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            const point = new Point({
              longitude: location.lng,
              latitude: location.lat,
            });
            this.findPlaces(this.selectedPlace, point);
          },
          (error) => {
            console.error('Geolocation error:', error);
          }
        );
      }
    );
  }

  findPlaces(category: string, pt: esri.Point) {
    const locatorUrl =
      'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer';

    if (category === 'Choose a place type...') {
      this.graphicsLayer.removeAll();
      return;
    }

    locator
      .addressToLocations(locatorUrl, {
        location: pt,
        categories: [category],
        maxLocations: 25,
        outFields: ['Place_addr', 'PlaceName'],
        address: undefined,
      })
      .then((results) => {
        this.graphicsLayer.removeAll();

        results.forEach((result) => {
          const graphic = new Graphic({
            attributes: result.attributes,
            geometry: result.location,
            symbol: new SimpleMarkerSymbol({
              color: '#000000',
              size: '12px',
              outline: {
                color: '#ffffff',
                width: '2px',
              },
            }),
            popupTemplate: {
              title: '{PlaceName}',
              content: '{Place_addr}',
            },
          });
          this.graphicsLayer.add(graphic);
        });
      })
      .catch((error) => {
        console.error('Error finding places: ', error);
      });
  }

  onPlaceChange(event: MatSelectChange) {
    if (!this.lastKnownPosition) {
      console.error('User location not yet available');
      return;
    }

    const point = new Point({
      longitude: this.lastKnownPosition.lng,
      latitude: this.lastKnownPosition.lat,
    });
    this.findPlaces(this.selectedPlace, point);
  }

  toggleGeoTracking() {
    this.trackingActive = !this.trackingActive;
    if (this.trackingActive) {
      this.startGeoTracking();
    } else {
      this.stopGeoTracking();
    }
  }

  startGeoTracking() {
    console.log('Starting geo tracking');
    this.trackingStartTime = Date.now();
    this.trackingInterval = setInterval(() => {
      if (!this.lastKnownPosition) {
        console.error('User location not yet available');
        return;
      }
      this.trackedLocations.push({
        lat: this.lastKnownPosition.lat,
        lng: this.lastKnownPosition.lng,
      });
    }, 1000);
  }

  haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    lat1 = toRadians(lat1);
    lon1 = toRadians(lon1);
    lat2 = toRadians(lat2);
    lon2 = toRadians(lon2);

    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const R = 6371.0;
    const distance = R * c;

    return distance;
  }

  stopGeoTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      console.log('Tracked locations:', this.trackedLocations);
      const array = this.trackedLocations.map((loc) => {
        return [loc.lng, loc.lat];
      });
      let totalDistance = 0;
      for (let i = 0; i < array.length - 1; i++) {
        totalDistance += this.haversine(
          array[i][1],
          array[i][0],
          array[i + 1][1],
          array[i + 1][0]
        );
      }
      console.log('Total distance:', totalDistance);

      const totalTimeMs = this.trackingStartTime
        ? Date.now() - this.trackingStartTime
        : 0;
      const totalTimeSeconds = Math.floor(totalTimeMs / 1000);
      this.trackingStartTime = 0;
      console.log('Total time:', totalTimeSeconds);

      this.addListItem(totalDistance, totalTimeSeconds);
    }
  }

  trackUserLocation() {
    console.log('Tracking user location');
    this.watchPositionId = navigator.geolocation.watchPosition((position) => {
      this.lastKnownPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      this.graphicsLayerUserLocation.removeAll();
      const point = new Point({
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      });
      const simpleMarkerSymbol = {
        type: 'simple-marker',
        color: [226, 119, 40],
        outline: {
          color: [255, 255, 255],
          width: 1,
        },
      };

      let pointGraphic: esri.Graphic = new Graphic({
        geometry: point,
        symbol: simpleMarkerSymbol,
      });

      this.graphicsLayerUserLocation.add(pointGraphic);
    });
  }

  connectFirebase() {
    if (this.isConnected) {
      return;
    }
    this.isConnected = true;
    this.fbs.connectToDatabase();
  }

  addListItem(distance: number, time: number) {
    const uid = localStorage.getItem('uid');
    if (uid) {
      this.fbs.addListObject(uid, distance, time);
    }
  }

  disconnectFirebase() {
    if (this.subscriptionList != null) {
      this.subscriptionList.unsubscribe();
    }
    if (this.subscriptionObj != null) {
      this.subscriptionObj.unsubscribe();
    }
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.destroy();
    }

    // Clear the watch position
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }

    // Clear tracking interval if it exists
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.disconnectFirebase();
  }
}
