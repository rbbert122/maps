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
import Polyline from '@arcgis/core/geometry/Polyline.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';

import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import * as route from '@arcgis/core/rest/route.js';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import RouteParameters from '@arcgis/core/rest/support/RouteParameters';

import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as locator from '@arcgis/core/rest/locator.js';

import { MatSelectChange } from '@angular/material/select';

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
  graphicsLayerUserPolylines!: esri.GraphicsLayer;
  graphicsLayerRoutes!: esri.GraphicsLayer;
  trailheadsLayer!: esri.FeatureLayer;

  zoom = 12;
  center: Array<number> = [26.096306, 44.439663];
  basemap = 'streets-vector';
  loaded = false;
  directionsElement: any;

  // Place category dropdown
  places = [
    'Choose a place type...',
    'Parks and Outdoors',
    'Coffee shop',
    'Food',
  ];
  selectedPlace: string = this.places[0];

  constructor() {}

  ngOnInit() {
    this.initializeMap().then(() => {
      this.loaded = this.view.ready;
      this.mapLoadedEvent.emit(true);
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
    this.trailheadsLayer = new FeatureLayer({
      url: 'https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0',
      outFields: ['*'],
    });
    this.map.add(this.trailheadsLayer);

    const trailsLayer = new FeatureLayer({
      url: 'https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0',
    });
    this.map.add(trailsLayer, 0);

    const parksLayer = new FeatureLayer({
      url: 'https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0',
    });
    this.map.add(parksLayer, 0);

    console.log('Feature layers added');
  }

  addGraphicsLayer() {
    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);
    this.graphicsLayerUserPoints = new GraphicsLayer();
    this.map.add(this.graphicsLayerUserPoints);
    this.graphicsLayerUserPolylines = new GraphicsLayer();
    this.map.add(this.graphicsLayerUserPolylines);
    this.graphicsLayerRoutes = new GraphicsLayer();
    this.map.add(this.graphicsLayerRoutes);
  }

  addRouting() {
    const routeUrl =
      'https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World';
    this.view.on('click', (event) => {
      this.view.hitTest(event).then((elem: esri.HitTestResult) => {
        if (elem && elem.results && elem.results.length > 0) {
          let point = elem.results.find((e) => e.layer === this.trailheadsLayer)
            ?.mapPoint as esri.Point | undefined;
          if (point) {
            console.log('get selected point: ', elem, point);
            if (this.graphicsLayerUserPoints.graphics.length === 0) {
              this.addPoint(point.latitude, point.longitude);
            } else if (this.graphicsLayerUserPoints.graphics.length === 1) {
              this.addPoint(point.latitude, point.longitude);
              this.calculateRoute(routeUrl);
            } else {
              this.removePoints();
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

  addPolyline(points: Array<Array<number>>) {
    let polyline = new Polyline({
      paths: [points],
    });

    const simpleLineSymbol = {
      type: 'simple-line',
      color: [226, 119, 40], // Orange
      width: 2,
    };

    let polylineGraphic: esri.Graphic = new Graphic({
      geometry: polyline,
      symbol: simpleLineSymbol,
    });

    this.graphicsLayerUserPolylines.add(polylineGraphic);
  }

  removePolylines() {
    this.graphicsLayerUserPolylines.removeAll();
  }

  async calculateRoute(routeUrl: string) {
    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: this.graphicsLayerUserPoints.graphics.toArray(),
      }),
      returnDirections: true,
    });

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
      this.removePolylines();
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
    this.findPlaces(event.value, this.view.center);
  }

  ngOnDestroy() {
    if (this.view) {
    }
  }
}
